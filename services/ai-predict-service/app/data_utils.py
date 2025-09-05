import pandas as pd
import numpy as np
from app.sentiment_fng import merge_fng_to_ohlcv, get_fng

def load_ohlcv_from_json(json_data):
    """Nếu json_data là DataFrame, trả về trực tiếp sau sort."""
    if isinstance(json_data, pd.DataFrame):
        df = json_data.copy()
        df['datetime'] = pd.to_datetime(df['datetime'], utc=True)
        return df.sort_values("datetime").reset_index(drop=True)
    
    rows = []
    for item in json_data["data"]:
        rows.append({
            "symbol": item["symbol"],
            "interval": item["interval"],
            "open": float(item["open"]),
            "high": float(item["high"]),
            "low": float(item["low"]),
            "close": float(item["close"]),
            "volume": float(item["volume"]),
            "datetime": pd.to_datetime(item["close_time"], unit="ms", utc=True)
        })
    df = pd.DataFrame(rows).sort_values("datetime").reset_index(drop=True)
    return df


def add_technical_features(df: pd.DataFrame, window: int = 5):
    """Thêm feature kỹ thuật cơ bản: returns, moving averages, volatility."""
    df = df.copy()
    df["return"] = df["close"].pct_change().fillna(0.0)
    df["ma"] = df["close"].rolling(window).mean().bfill().ffill()
    df["volatility"] = df["return"].rolling(window).std().bfill().ffill()
    return df

def prepare_features(df: pd.DataFrame, add_sentiment=True):
    """Chuẩn hóa dữ liệu cuối cùng để predict."""
    if add_sentiment:
        fng_df = get_fng(limit=365)
        df = merge_fng_to_ohlcv(df, fng_df)  # đã ffill + bfill
        df['sentiment'] = df['sentiment'].fillna(0.0)
    df = add_technical_features(df)
    df = df.fillna(0.0)  # điền toàn bộ các cột còn NaN
    feature_cols = ["open", "high", "low", "close", "volume", "return", "ma", "volatility", "sentiment"]
    X = df[feature_cols]
    return X, df
