import os
import pandas as pd
from pathlib import Path
from app.config import settings
from app.sentiment_fng import get_fng, merge_fng_to_ohlcv
from train.train_one import train_one
from train.fetch_data import fetch_binance_kline  # bạn tách hàm fetch_binance_kline sang file riêng
from app.config import settings

DATA_DIR = Path(os.getenv("DATA_PATH", "./data/hist"))
DATA_DIR.mkdir(parents=True, exist_ok=True)


def save_csv(symbol: str, interval: str, df: pd.DataFrame) -> Path:
    # Map interval sang tên chuẩn để tránh ghi đè
    safe_interval = settings.interval_map.get(interval, interval.lower())

    path = DATA_DIR / f"{symbol}_{safe_interval}.csv"
    df.to_csv(path, index=False)
    return path


if __name__ == '__main__':
    interval = os.getenv("TRAIN_INTERVAL")  # train 1 interval nếu muốn
    symbols = settings.SYMBOL_WHITELIST
    intervals = [interval] if interval else settings.INTERVALS

    # fetch FNG sentiment
    try:
        fng_df = get_fng(limit=365)
    except Exception as e:
        print("Warning: FNG fetch failed, fallback sentiment=0.0:", e)
        fng_df = None

    # train riêng cho từng symbol + interval
    for iv in intervals:
        for sym in symbols:
            try:
                print(f"Fetching {sym} {iv}...")
                # tăng số nến fetch lên 3000 (nếu bạn muốn)
                df = fetch_binance_kline(sym, iv, limit=1000)

                # merge fng như trước
                if fng_df is not None:
                    df = merge_fng_to_ohlcv(df, fng_df=fng_df, normalize=True)
                else:
                    df["sentiment"] = 0.0

                df["symbol"] = sym
                save_csv(sym, iv, df)

                print(f"Training model for {sym}-{iv} ...")
                train_one(sym, iv, df, seq_len=20, n_estimators=800, learning_rate=0.05)
                df = fetch_binance_kline(sym, iv, limit=1000)



                print(f"✅ Done {sym}-{iv}")

            except Exception as e:
                print(f"❌ Failed {sym}-{iv}: {e}")
