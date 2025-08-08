# =========================
# src/app/services/ws_manager.py
# =========================
# Simple skeletal websocket manager for Binance (reconnect logic recommended)
import asyncio
import websockets
import json
from app.config import settings
from app.storage.redis_client import redis_client

class WSManager:
    def __init__(self):
        self.url = settings.BINANCE_WS_BASE
        self._task = None
        self._running = False

    async def _connect_and_consume(self, subscribe_payload: dict):
        uri = f"{self.url}/{subscribe_payload['stream']}"
        backoff = 1
        while self._running:
            try:
                async with websockets.connect(uri, ping_interval=20, close_timeout=5) as ws:
                    backoff = 1
                    async for msg in ws:
                        # parse and transform, then push to redis stream / lists
                        data = json.loads(msg)
                        # expected kline payload has 'k' object
                        if 'k' in data:
                            k = data['k']
                            candle = {
                                'symbol': k['s'],
                                'interval': k['i'],
                                'open': float(k['o']),
                                'high': float(k['h']),
                                'low': float(k['l']),
                                'close': float(k['c']),
                                'volume': float(k['v']),
                                'close_time': int(k['T'])
                            }
                            # push to redis list and stream
                            await redis_client.lpush_candle(candle['interval'], candle['symbol'], candle, maxlen=settings.CANDLES_LIST_MAX)
                            await redis_client.append_stream('stream:price_events', {'candle': json.dumps(candle), 'symbol': candle['symbol']})
                            # update realtime
                            await redis_client.set_realtime(candle['symbol'], {'price': candle['close'], 'timestamp': candle['close_time']})
            except Exception:
                await asyncio.sleep(backoff)
                backoff = min(backoff * 2, 60)

    def start(self, stream: dict):
        self._running = True
        self._task = asyncio.create_task(self._connect_and_consume(stream))

    def stop(self):
        self._running = False
        if self._task:
            self._task.cancel()

ws_manager = WSManager()
