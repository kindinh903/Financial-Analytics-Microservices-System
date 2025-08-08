# =========================
# src/app/tasks/aggregator.py
# =========================
# A simple aggregator that composes 1m -> 5m using recent Redis list
import time
from app.storage.redis_client import redis_client
from app.services.price_service import price_service
from app.utils.lock import redlock

async def aggregate_1m_to_5m(symbol: str):
    # lock per symbol
    lock_key = f"agg:{symbol}:5m"
    async with redlock(lock_key, ttl=30_000):
        # read recent 1m candles from redis
        ones = await redis_client.get_candles_list('1m', symbol, 0, -1)
        if not ones:
            return
        # group by 5m window (close_time in ms)
        # naive approach: take last 5 entries -> aggregate
        chunk = ones[:5]
        if len(chunk) < 1:
            return
        opens = chunk[-1]['open']
        highs = max(c['high'] for c in chunk)
        lows = min(c['low'] for c in chunk)
        close = chunk[0]['close']
        vol = sum(c['volume'] for c in chunk)
        close_time = chunk[0]['close_time']
        candle5 = {'symbol': symbol, 'interval': '5m', 'open': opens, 'high': highs, 'low': lows, 'close': close, 'volume': vol, 'close_time': close_time}
        await price_service.save_candle(symbol, '5m', candle5)
