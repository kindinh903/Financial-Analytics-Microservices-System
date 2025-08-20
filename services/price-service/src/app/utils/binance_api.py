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

async def fetch_market_snapshot(symbols: List[str]):
    """
    Lấy snapshot thị trường cho nhiều cặp coin (thay đổi %, giá hiện tại, volume...).
    """
    url = f"{settings.BINANCE_REST_BASE}/ticker/24hr"
    async with httpx.AsyncClient(timeout=10) as c:
        results = []
        for symbol in symbols:
            r = await c.get(url, params={"symbol": symbol})
            r.raise_for_status()
            data = r.json()
            results.append({
                "symbol": data["symbol"],
                "price_change": float(data["priceChange"]),
                "price_change_percent": float(data["priceChangePercent"]),
                "last_price": float(data["lastPrice"]),
                "volume": float(data["volume"]),
                "quote_volume": float(data["quoteVolume"])
            })
        return results

async def fetch_top_movers(limit: int = 10):
    """
    Lấy top gainers và losers trong 24h (theo phần trăm thay đổi).
    """
    url = f"{settings.BINANCE_REST_BASE}/ticker/24hr"
    async with httpx.AsyncClient(timeout=20) as c:
        r = await c.get(url)
        r.raise_for_status()
        data = r.json()

        # Sắp xếp theo phần trăm thay đổi
        sorted_data = sorted(data, key=lambda x: float(x["priceChangePercent"]))

        losers = [{
            "symbol": item["symbol"],
            "last_price": float(item["lastPrice"]),
            "price_change_percent": float(item["priceChangePercent"]),
            "volume": float(item["volume"])
        } for item in sorted_data[:limit]]

        gainers = [{
            "symbol": item["symbol"],
            "last_price": float(item["lastPrice"]),
            "price_change_percent": float(item["priceChangePercent"]),
            "volume": float(item["volume"])
        } for item in sorted_data[-limit:]]

        return {"top_gainers": gainers[::-1], "top_losers": losers}
