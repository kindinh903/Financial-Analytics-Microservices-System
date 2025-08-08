# =========================
# src/app/services/price_service.py
# =========================
from typing import List, Optional
from app.storage.redis_client import redis_client
from app.storage.influx_client import influx_writer
from app.utils.binance_api import fetch_klines
from app.config import settings

class PriceService:
    def __init__(self):
        self.redis = redis_client
        self.influx = influx_writer

    async def get_candles(self, symbol: str, interval: str, limit: int = 500, start_time: int | None = None, end_time: int | None = None) -> List[dict]:
        # Step 1: try Redis list (fast)
        cached = await self.redis.get_candles_list(interval, symbol, 0, -1)
        if cached:
            # convert and slice by time if requested
            filtered = cached
            if start_time or end_time:
                filtered = [c for c in cached if (not start_time or c['close_time'] >= start_time) and (not end_time or c['close_time'] <= end_time)]
            return filtered[:limit]

        # Step 2: query Influx
        # For brevity, we'll call Binance REST if Redis misses (you can add Influx query here)
        # Step 3: fallback Binance REST
        klines = await fetch_klines(symbol, interval, limit=limit, start_time=start_time, end_time=end_time)
        # store into Redis & Influx asynchronously
        for c in klines:
            await self.save_candle(symbol, interval, c, persist_influx=False)
        # write batch to influx once (avoid per candle writes)
        await self.influx.write_batch(klines)
        return klines

    async def save_candle(self, symbol: str, interval: str, candle: dict, persist_influx: bool = True):
        # store to Redis list and stream
        await self.redis.lpush_candle(interval, symbol, candle, maxlen=settings.CANDLES_LIST_MAX)
        await self.redis.append_stream("stream:price_events", {"candle": json_dumps(candle), "symbol": symbol})
        if persist_influx:
            await self.influx.write_batch([candle])

    async def get_realtime_price(self, symbol: str):
        return await self.redis.get_realtime(symbol)

    async def update_realtime_price(self, symbol: str, price: float, timestamp: int):
        obj = {"symbol": symbol, "price": price, "timestamp": timestamp}
        await self.redis.set_realtime(symbol, obj, ttl=3600)


import json

def json_dumps(o):
    return json.dumps(o, separators=(",", ":"))

price_service = PriceService()
