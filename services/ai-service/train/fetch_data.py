import requests
import pandas as pd

def fetch_binance_kline(symbol: str, interval: str, limit: int = 1000) -> pd.DataFrame:
    """Fetch historical kline (OHLCV) data from Binance REST API"""
    url = "https://api.binance.com/api/v3/klines"
    params = {"symbol": symbol, "interval": interval, "limit": limit}
    resp = requests.get(url, params=params, timeout=10)
    resp.raise_for_status()
    data = resp.json()

    # Tạo DataFrame với cột Binance trả về
    df = pd.DataFrame(data, columns=[
        "open_time","open","high","low","close","volume",
        "close_time","qav","num_trades","taker_base_vol",
        "taker_quote_vol","ignore"
    ])

    # Chuyển đổi kiểu dữ liệu
    df["open_time"] = pd.to_datetime(df["open_time"], unit="ms")
    df["close"] = df["close"].astype(float)
    df["open"] = df["open"].astype(float)
    df["high"] = df["high"].astype(float)
    df["low"] = df["low"].astype(float)
    df["volume"] = df["volume"].astype(float)

    # Chuẩn hóa format để train (datetime + OHLCV)
    df = df.rename(columns={"open_time": "datetime"})
    df = df[["datetime", "open", "high", "low", "close", "volume"]]

    return df
