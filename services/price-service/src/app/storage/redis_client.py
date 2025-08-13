# =========================
# src/app/storage/redis_client.py
# =========================
import redis.asyncio as aioredis
import json
from typing import Optional, List

class RedisClient:
    def __init__(self):
        self._client: Optional[aioredis.Redis] = None

    async def init(self, url: str):
        self._client = aioredis.from_url(url, decode_responses=True)

    async def close(self):
        if self._client:
            await self._client.close()

    # Stream append for reliable pipeline
    async def append_stream(self, stream_key: str, data: dict) -> str:
        return await self._client.xadd(stream_key, data)

    async def lpush_candle(self, interval: str, symbol: str, candle: dict, maxlen: int = 1000):
        key = f"candles:list:{interval}:{symbol}"
        # LPUSH + LTRIM in pipeline
        pipe = self._client.pipeline()
        pipe.lpush(key, json.dumps(candle))
        pipe.ltrim(key, 0, maxlen - 1)
        await pipe.execute()

    async def get_candles_list(self, interval: str, symbol: str, start: int = 0, end: int = -1) -> List[dict]:
        key = f"candles:list:{interval}:{symbol}"
        raw = await self._client.lrange(key, start, end)
        return [json.loads(x) for x in raw]

    async def set_realtime(self, symbol: str, price_obj: dict, ttl: Optional[int] = None):
        key = f"realtime:{symbol}"
        if ttl:
            await self._client.set(key, json.dumps(price_obj), ex=ttl)
        else:
            await self._client.set(key, json.dumps(price_obj))
        # publish short notification
        await self._client.publish("price_updates", json.dumps({"symbol": symbol, "price": price_obj}))

    async def get_realtime(self, symbol: str):
        key = f"realtime:{symbol}"
        v = await self._client.get(key)
        return json.loads(v) if v else None

    # Stream consumer utilities
    async def xgroup_create(self, stream: str, group: str):
        try:
            await self._client.xgroup_create(stream, group, id="$", mkstream=True)
        except Exception:
            # group exists
            pass

    async def xreadgroup(self, stream: str, group: str, consumer: str, count: int = 100, block: int = 1000):
        # returns list of tuples (stream, [ (id, {field:val}) ])
        res = await self._client.xread_group(group, consumer, {stream: ">"}, count=count, block=block)
        return res

    async def xack(self, stream: str, group: str, ids: list):
        await self._client.xack(stream, group, *ids)


redis_client = RedisClient()
