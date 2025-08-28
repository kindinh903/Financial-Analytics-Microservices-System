import redis
import json
from app.config import settings

r = redis.from_url(settings.REDIS_URL, decode_responses=True)

# store candles list as JSON under key candles:{symbol}:{interval}
def push_candle(symbol: str, interval: str, candle: dict, maxlen: int = 512):
    key = f"candles:{symbol}:{interval}"
    # push newest to left
    r.lpush(key, json.dumps(candle))
    r.ltrim(key, 0, maxlen-1)

def get_candles(symbol: str, interval: str, n: int = 128):
    key = f"candles:{symbol}:{interval}"
    items = r.lrange(key, 0, n-1)
    # lrange returns newest->oldest, we need oldest->newest
    items = [json.loads(x) for x in items][::-1]
    return items
