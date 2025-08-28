# app/sentiment_fng.py
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
        # API returns 'timestamp' (unix seconds) in many clients; fallbacks included
        ts = it.get("timestamp") or it.get("time") or it.get("timestamp_seconds")
        if ts is None:
            continue
        # ensure integer, if string
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

def merge_fng_to_ohlcv(ohlcv_df: pd.DataFrame, fng_df: pd.DataFrame = None, method: str = "ffill", normalize: bool = True):
    """
    Align FNG values to ohlcv_df datetimes.
    - ohlcv_df must have 'datetime' column (pd.Timestamp)
    - method: 'ffill' or 'bfill' or 'zero'
    - normalize: True -> map 0..100 -> -1..1
    Returns a new dataframe with added column 'sentiment'
    """
    df = ohlcv_df.copy()
    df['datetime'] = pd.to_datetime(df['datetime'])

    if fng_df is None:
        fng_df = get_fng(limit=365)

    fng = fng_df.copy()
    fng['datetime'] = pd.to_datetime(fng['datetime'])
    # set index to datetimes and reindex on the ohlcv datetimes
    fng = fng.set_index('datetime').sort_index()
    reidx = pd.DataFrame(index=df['datetime'])
    # reindex will create NaNs where no daily value exists
    fng_reindexed = fng.reindex(reidx.index, method=None)
    if method == "ffill":
        fng_reindexed = fng_reindexed.fillna(method='ffill')
    elif method == "bfill":
        fng_reindexed = fng_reindexed.fillna(method='bfill')
    else:
        fng_reindexed = fng_reindexed.fillna(50)  # neutral

    reidx['fng'] = fng_reindexed['fng'].values
    # fill remaining NaNs to neutral 50
    reidx['fng'] = reidx['fng'].fillna(50)

    if normalize:
        # map 0..100 -> -1..1 with 50 -> 0
        reidx['sentiment'] = (reidx['fng'] - 50.0) / 50.0
    else:
        reidx['sentiment'] = reidx['fng']

    reidx = reidx.reset_index().rename(columns={'index':'datetime'})
    out = df.merge(reidx[['datetime','sentiment']], on='datetime', how='left')
    out['sentiment'] = out['sentiment'].fillna(0.0)
    return out
