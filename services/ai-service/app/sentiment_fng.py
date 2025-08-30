import os
from pathlib import Path
from datetime import datetime, timedelta
import requests
import pandas as pd

API_URL = os.getenv("FNG_API_URL", "https://api.alternative.me/fng/")
CACHE_PATH = Path(os.getenv("FNG_CACHE_PATH", "./data/fng.csv"))
CACHE_TTL_HOURS = int(os.getenv("FNG_CACHE_TTL_HOURS", 6))

def fetch_fng_raw(limit: int = 1000):
    """Fetch raw FNG JSON from alternative.me API. Returns DataFrame with columns ['datetime','fng','fng_class']"""
    params = {"limit": limit, "format": "json"}
    resp = requests.get(API_URL, params=params, timeout=10)
    resp.raise_for_status()
    j = resp.json()
    data = j.get("data", [])
    rows = []
    for it in data:
        ts = it.get("timestamp") or it.get("time") or it.get("timestamp_seconds")
        if ts is None:
            continue
        try:
            ts = int(ts)
        except Exception:
            ts = int(float(ts))
        dt = datetime.utcfromtimestamp(ts)
        rows.append({
            "datetime": pd.to_datetime(dt),
            "fng": float(it.get("value", None)),
            "fng_class": it.get("value_classification", None)
        })
    df = pd.DataFrame(rows).sort_values("datetime").reset_index(drop=True)
    return df

def load_fng_cache():
    if CACHE_PATH.exists():
        mtime = datetime.utcfromtimestamp(CACHE_PATH.stat().st_mtime)
        if datetime.utcnow() - mtime < timedelta(hours=CACHE_TTL_HOURS):
            return pd.read_csv(CACHE_PATH, parse_dates=["datetime"])
    return None

def save_fng_cache(df: pd.DataFrame):
    CACHE_PATH.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(CACHE_PATH, index=False)

def get_fng(limit: int = 1000, refresh: bool = False):
    """Return FNG DataFrame (cached)."""
    if not refresh:
        cached = load_fng_cache()
        if cached is not None:
            return cached
    df = fetch_fng_raw(limit)
    save_fng_cache(df)
    return df

def merge_fng_to_ohlcv(ohlcv_df: pd.DataFrame, fng_df: pd.DataFrame = None, normalize: bool = True):
    df = ohlcv_df.copy()
    df['date'] = pd.to_datetime(df['datetime']).dt.date

    # --- Load FNG ---
    if fng_df is None:
        fng_df = get_fng(limit=365)

    fng_df = fng_df.copy()
    fng_df['date'] = pd.to_datetime(fng_df['datetime']).dt.date

    # --- Chuẩn hóa sentiment ---
    if normalize:
        fng_df['sentiment'] = (fng_df['fng'] - 50.0) / 50.0
    else:
        fng_df['sentiment'] = fng_df['fng']

    # --- Feature engineering từ FNG ---
    fng_df = fng_df.sort_values('date')
    fng_df['sentiment_diff'] = fng_df['sentiment'].diff().fillna(0)
    fng_df['sentiment_ma3'] = fng_df['sentiment'].rolling(3).mean().fillna(method='bfill')
    fng_df['sentiment_vol7'] = fng_df['sentiment'].rolling(7).std().fillna(0)

    # --- Merge với OHLCV ---
    merged = df.merge(
        fng_df[['date', 'sentiment', 'sentiment_diff', 'sentiment_ma3', 'sentiment_vol7']],
        on='date',
        how='left'
    )

    # fill missing bằng neutral (0) nếu thiếu ngày
    merged[['sentiment', 'sentiment_diff', 'sentiment_ma3', 'sentiment_vol7']] = merged[
        ['sentiment', 'sentiment_diff', 'sentiment_ma3', 'sentiment_vol7']
    ].fillna(0)

    return merged.drop(columns=['date'])
