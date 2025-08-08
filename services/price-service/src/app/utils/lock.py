# =========================
# src/app/utils/lock.py
# =========================
import aioredis
from contextlib import asynccontextmanager

@asynccontextmanager
async def redlock(key: str, ttl: int = 10000):
    # simple lock using SET NX + expire. For production, use Redlock algorithm or redis-py lock
    redis = aioredis.from_url("redis://localhost:6379/0", decode_responses=True)
    token = "1"
    ok = await redis.set(key, token, nx=True, px=ttl)
    try:
        if not ok:
            # wait and retry small
            raise RuntimeError("lock not acquired")
        yield
    finally:
        try:
            val = await redis.get(key)
            if val == token:
                await redis.delete(key)
        except Exception:
            pass
