# =========================
# src/app/utils/binance_api.py
# =========================
import httpx
from app.config import settings
from typing import List

async def fetch_klines(symbol: str, interval: str, limit: int = 1000, start_time: int | None = None, end_time: int | None = None):
    params = {"symbol": symbol, "interval": interval, "limit": limit}
    if start_time:
        params["startTime"] = start_time
    if end_time:
        params["endTime"] = end_time
    url = f"{settings.BINANCE_REST_BASE}/klines"
    async with httpx.AsyncClient(timeout=10) as c:
        r = await c.get(url, params=params)
        r.raise_for_status()
        data = r.json()
        # data: list of arrays -> convert to our Candle dicts
        out = []
        for item in data:
            # item indexes based on Binance kline
            out.append({
                "symbol": symbol,
                "interval": interval,
                "open": float(item[1]),
                "high": float(item[2]),
                "low": float(item[3]),
                "close": float(item[4]),
                "volume": float(item[5]),
                "close_time": int(item[6])
            })
        return out
