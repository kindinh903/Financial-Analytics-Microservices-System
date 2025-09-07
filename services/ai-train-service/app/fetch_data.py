import requests
import pandas as pd

import requests
import pandas as pd
import time
from datetime import datetime, timedelta

BINANCE_API = "https://api.binance.com/api/v3/klines"

def fetch_binance_kline(symbol: str, interval: str, 
                        start_time: str = None, 
                        end_time: str = None,
                        limit: int = 1000,
                        max_retries: int = 5,
                        sleep_sec: float = 1.0) -> pd.DataFrame:
    """
    Fetch historical kline (OHLCV) data from Binance REST API.
    Hỗ trợ lấy nhiều hơn 1000 nến bằng cách phân trang với startTime/endTime.
    
    Args:
        symbol: ví dụ "BTCUSDT"
        interval: ví dụ "1m", "1h", "1d"
        start_time: datetime string hoặc None -> mặc định 1000 nến gần nhất
        end_time: datetime string hoặc None -> đến thời điểm hiện tại
        limit: Binance tối đa 1000
        max_retries: số lần retry nếu lỗi timeout
        sleep_sec: thời gian nghỉ giữa các request (tránh rate limit)

    Returns:
        DataFrame chứa toàn bộ OHLCV
    """
    all_data = []
    params = {"symbol": symbol, "interval": interval, "limit": limit}

    # Nếu có start_time, convert sang ms
    if start_time:
        if isinstance(start_time, str):
            start_ts = int(pd.to_datetime(start_time).timestamp() * 1000)
        else:
            start_ts = int(start_time.timestamp() * 1000)
        params["startTime"] = start_ts

    if end_time:
        if isinstance(end_time, str):
            end_ts = int(pd.to_datetime(end_time).timestamp() * 1000)
        else:
            end_ts = int(end_time.timestamp() * 1000)
        params["endTime"] = end_ts

    while True:
        for attempt in range(max_retries):
            try:
                resp = requests.get(BINANCE_API, params=params, timeout=15)
                resp.raise_for_status()
                data = resp.json()
                break
            except requests.exceptions.RequestException as e:
                print(f"⚠️ Retry {attempt+1}/{max_retries} for {symbol}-{interval}: {e}")
                time.sleep(2**attempt)  # exponential backoff
        else:
            raise RuntimeError(f"❌ Failed to fetch Binance kline after {max_retries} retries")

        if not data:
            break

        all_data.extend(data)

        # Nếu số lượng dữ liệu trả về < limit thì đã hết dữ liệu
        if len(data) < limit:
            break

        # Tiếp tục từ close_time cuối cùng + 1 ms
        last_close_time = data[-1][6]  
        params["startTime"] = last_close_time + 1

        time.sleep(sleep_sec)

    # Convert thành DataFrame
    if not all_data:
        return pd.DataFrame()

    df = pd.DataFrame(all_data, columns=[
        "open_time","open","high","low","close","volume",
        "close_time","qav","num_trades","taker_base_vol",
        "taker_quote_vol","ignore"
    ])

    df["open_time"] = pd.to_datetime(df["open_time"], unit="ms")
    df["close_time"] = pd.to_datetime(df["close_time"], unit="ms")
    df["open"] = df["open"].astype(float)
    df["high"] = df["high"].astype(float)
    df["low"] = df["low"].astype(float)
    df["close"] = df["close"].astype(float)
    df["volume"] = df["volume"].astype(float)

    df = df.rename(columns={"open_time": "datetime"})
    df = df[["datetime", "open", "high", "low", "close", "volume"]]
    return df
