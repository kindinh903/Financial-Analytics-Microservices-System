import os
from pathlib import Path
from datetime import datetime, timedelta
import requests
import pandas as pd
from config import settings


def fetch_fng_raw(limit: int = 1000):
    """Fetch raw FNG JSON from alternative.me API. Returns DataFrame with columns ['datetime','fng','fng_class']"""
    params = {"limit": limit, "format": "json"}
    resp = requests.get(settings.API_URL, params=params, timeout=10)
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

def fetch_fng_internal(symbol: str = "BTCUSDT", days: int = 365):
    """Fetch FNG-style data từ sentiment service nội bộ.
       Trả DataFrame ['datetime','fng','fng_class'] hoặc None nếu fail.
    """
    try:
        url = f"http://localhost:8001/data/sentiment/summary/{symbol}?days={days}"
        resp = requests.get(url, timeout=5)
        resp.raise_for_status()
        data = resp.json()

        if not data or data.get("total_articles", 0) == 0:
            return None

        dt = pd.to_datetime(data.get("analyzed_at", datetime.utcnow().isoformat()))
        fng = float(data.get("average_confidence", 0.0)) * 100.0

        df = pd.DataFrame([{
            "datetime": dt,
            "fng": fng,
            "fng_class": map_fng_class(fng)
        }])
        return df
    except Exception as e:
        print(f"[WARN] Internal sentiment service failed: {e}")
        return None

def load_fng_cache():
    if settings.CACHE_PATH.exists():
        mtime = datetime.utcfromtimestamp(settings.CACHE_PATH.stat().st_mtime)
        if datetime.utcnow() - mtime < timedelta(hours=settings.CACHE_TTL_HOURS):
            return pd.read_csv(settings.CACHE_PATH, parse_dates=["datetime"])
    return None

def save_fng_cache(df: pd.DataFrame):
    settings.CACHE_PATH.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(settings.CACHE_PATH, index=False)

def get_fng(limit: int = 1000, refresh: bool = False):
    """Return FNG DataFrame (cached), ưu tiên internal service -> external API."""
    if not refresh:
        cached = load_fng_cache()
        if cached is not None:
            return cached

    # # ✅ Ưu tiên internal
    # internal_df = fetch_fng_internal(days=limit)
    # if internal_df is not None:
    #     save_fng_cache(internal_df)
    #     return internal_df

    # ✅ Fallback external (giữ nguyên logic cũ)
    df = fetch_fng_raw(limit)
    save_fng_cache(df)
    return df

def map_fng_class(fng: float) -> str:
    if fng <= 24:
        return "Extreme Fear"
    elif fng <= 49:
        return "Fear"
    elif fng <= 54:
        return "Neutral"
    elif fng <= 74:
        return "Greed"
    else:
        return "Extreme Greed"


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
