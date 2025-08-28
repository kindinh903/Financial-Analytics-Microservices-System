import os
import requests
import pandas as pd
from pathlib import Path
from app.config import settings
from train.train_one import train_one
from app.sentiment_fng import get_fng, merge_fng_to_ohlcv

# Thư mục dữ liệu
DATA_DIR = Path(os.getenv("DATA_PATH", "./data/hist"))
DATA_DIR.mkdir(parents=True, exist_ok=True)

def fetch_binance_kline(symbol: str, interval: str, limit: int = 1000) -> pd.DataFrame:
    """Fetch historical kline (OHLCV) data from Binance REST API"""
    url = "https://api.binance.com/api/v3/klines"
    params = {"symbol": symbol, "interval": interval, "limit": limit}
    resp = requests.get(url, params=params, timeout=10)
    resp.raise_for_status()
    data = resp.json()

    df = pd.DataFrame(data, columns=[
        "open_time","open","high","low","close","volume",
        "close_time","qav","num_trades","taker_base_vol",
        "taker_quote_vol","ignore"
    ])
    df["open_time"] = pd.to_datetime(df["open_time"], unit="ms")
    df["close"] = df["close"].astype(float)

    # Giữ lại cột cần thiết
    return df[["open_time", "close"]].rename(columns={"open_time": "datetime"})

def save_csv(symbol: str, interval: str, df: pd.DataFrame) -> Path:
    """Save dataframe to CSV file"""
    path = DATA_DIR / f"{symbol}_{interval}.csv"
    df.to_csv(path, index=False)
    return path

if __name__ == '__main__':
    interval = os.getenv("TRAIN_INTERVAL")  # nếu muốn chỉ train 1 interval
    symbols = settings.SYMBOL_WHITELIST
    intervals = [interval] if interval else settings.INTERVALS

    # 🔥 chỉ gọi FNG một lần
    try:
        fng_df = get_fng(limit=365)
    except Exception as e:
        print("Warning: FNG fetch failed, fallback sentiment=0.0:", e)
        fng_df = None

    for sym in symbols:
        for iv in intervals:
            try:
                print(f"Fetching {sym} {iv}...")
                df = fetch_binance_kline(sym, iv, limit=1000)

                # merge sentiment
                if fng_df is not None:
                    df = merge_fng_to_ohlcv(df, fng_df=fng_df, method="ffill", normalize=True)
                else:
                    df["sentiment"] = 0.0

                path = save_csv(sym, iv, df)
                print(f"Saved to {path}")

                print(f"Training model for {sym}-{iv} ...")
                train_one(sym, iv, df)
                print(f"✅ Done {sym}-{iv}")

            except Exception as e:
                print(f"❌ Failed {sym}-{iv}: {e}")
