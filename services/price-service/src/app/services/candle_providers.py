# src/app/services/candle_providers.py
from typing import List, Optional
from app.storage.redis_client import redis_client
from app.storage.influx_client import influx_writer
from app.utils.binance_api import fetch_klines, fetch_market_snapshot, fetch_top_movers
from app.config import settings, SYMBOL_WHITELIST, INTERVALS

class CandleProvider:
    def __init__(self, next_provider: Optional["CandleProvider"] = None):
        self.next = next_provider

    async def get(self, symbol: str, interval: str, limit: int, start_time: int, end_time: int, existing: List[dict]):
        raise NotImplementedError


class RedisProvider(CandleProvider):
    async def get(self, symbol, interval, limit, start_time, end_time, existing):
        data = await redis_client.get_candles_list(interval, symbol, 0, -1) or []
        if start_time or end_time:
            data = [
                c for c in data
                if (not start_time or c['close_time'] >= start_time)
                and (not end_time or c['close_time'] <= end_time)
            ]
        if len(data) >= limit:
            return data[:limit]
        return await self.next.get(symbol, interval, limit, start_time, end_time, data) if self.next else data


class InfluxProvider(CandleProvider):
    async def get(self, symbol, interval, limit, start_time, end_time, existing):
        data = await influx_writer.query_candles(symbol, interval, limit, start_time, end_time) or []
        merged = {c['close_time']: c for c in (existing + data)}.values()
        merged = sorted(merged, key=lambda x: x['close_time'], reverse=True)
        if len(merged) >= limit:
            return merged[:limit]
        return await self.next.get(symbol, interval, limit, start_time, end_time, list(merged)) if self.next else merged


class BinanceProvider(CandleProvider):
    def __init__(self, fetch_func, next_provider=None):
        super().__init__(next_provider)
        self.fetch_func = fetch_func

    async def get(self, symbol, interval, limit, start_time, end_time, existing):
        return await self.fetch_func(symbol, interval, existing, limit, start_time, end_time)
