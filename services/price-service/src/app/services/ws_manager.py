import asyncio
import websockets
import json
import logging
from app.config import settings, SYMBOL_WHITELIST
from app.storage.redis_client import redis_client
from app.storage.influx_client import influx_writer

logger = logging.getLogger(__name__)
class WSManager:
    def __init__(self, intervals=None):
        self.url = settings.BINANCE_WS_BASE
        self._task = None
        self._running = False
        # Nếu không truyền intervals thì mặc định listen 1m
        self.intervals = intervals or ["1m"]

    async def _connect_and_consume(self):
        # Tạo list stream theo tất cả symbol và interval
        streams = "/".join(
            f"{symbol.lower()}@kline_{interval}" 
            for symbol in SYMBOL_WHITELIST 
            for interval in self.intervals
        )
        uri = f"{self.url}/stream?streams={streams}"
        backoff = 1

        while self._running:
            try:
                async with websockets.connect(uri, ping_interval=20, close_timeout=5) as ws:
                    logger.info(f"Connected to WS combined stream")
                    backoff = 1
                    async for msg in ws:
                        try:
                            data = json.loads(msg)
                            k = data.get("data", {}).get("k", None)
                            if k:
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

                                # Cập nhật realtime price (mặc định lưu giá cuối)
                                await redis_client.set_realtime(
                                    candle['symbol'],
                                    {'price': candle['close'], 'timestamp': candle['close_time']}
                                )

                                # Nếu nến đóng
                                if k['x'] is True:
                                    await redis_client.lpush_candle(
                                        candle['interval'], candle['symbol'], candle,
                                        maxlen=settings.CANDLES_LIST_MAX
                                    )
                                    await redis_client.append_stream(
                                        'stream:price_events',
                                        {'candle': json.dumps(candle), 'symbol': candle['symbol']}
                                    )
                                    await influx_writer.write_batch([candle])
                                    logger.info(f"Saved candle for {candle['symbol']} {candle['interval']} at {candle['close_time']}")
                        except Exception as e:
                            logger.error(f"Error parsing WS message: {e}")
            except Exception as e:
                logger.error(f"WS connection error ({uri}): {e}")
                await asyncio.sleep(backoff)
                backoff = min(backoff * 2, 60)

    def start(self):
        self._running = True
        self._task = asyncio.create_task(self._connect_and_consume())

    def stop(self):
        self._running = False
        if self._task:
            self._task.cancel()
            self._task = None

# Khởi tạo với các interval bạn muốn lắng nghe
ws_manager = WSManager(intervals=["1m", "5m", "15m", "1h"])
