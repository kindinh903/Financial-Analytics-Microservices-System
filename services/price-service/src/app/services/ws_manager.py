import asyncio
import websockets
import json
import logging
from datetime import datetime
from app.config import settings, SYMBOL_WHITELIST
from app.storage.redis_client import redis_client
from app.storage.influx_client import influx_writer
from app.services.broadcast import price_stream, candle_stream
from app.services.kafka_producer import kafka_producer


logger = logging.getLogger(__name__)

class WSManager:
    def __init__(self, intervals=None):
        self.url = settings.BINANCE_WS_BASE
        self._task = None
        self._running = False
        self.intervals = intervals or ["1m"]
        self.interval_stats = {i: 0 for i in self.intervals}  # Đếm số nến nhận được theo interval

    async def _connect_and_consume(self):
        streams = "/".join(
            f"{symbol.lower()}@kline_{interval}" 
            for symbol in SYMBOL_WHITELIST 
            for interval in self.intervals
        )
        uri = f"{self.url}/stream?streams={streams}"
        backoff = 1

        # Task in log định kỳ
        asyncio.create_task(self._log_interval_stats())

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

                                # Lưu giá realtime vào Redis
                                await redis_client.set_realtime(
                                    candle['symbol'],
                                    {'price': candle['close'], 'timestamp': candle['close_time']}
                                )

                                # Broadcast giá realtime chỉ cho interval "1m"
                                if candle['interval'] == "1m":
                                    price_update = {
                                        "symbol": candle['symbol'],
                                        "price": candle['close'],
                                        "timestamp": candle['close_time']
                                    }
                                    await price_stream.broadcast(price_update)
                                    
                                    # Gửi price update đến Kafka
                                    await kafka_producer.send_price_update(
                                        candle['symbol'],
                                        {
                                            "price": candle['close'],
                                            "timestamp": candle['close_time'],
                                            "volume": candle['volume']
                                        }
                                    )

                                # Nếu nến đóng (x=True)
                                if k['x'] is True:
                                    self.interval_stats[candle['interval']] = self.interval_stats.get(candle['interval'], 0) + 1

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

                                    # Broadcast nến khi đóng
                                    await candle_stream.broadcast({
                                        "symbol": candle['symbol'],
                                        "interval": candle['interval'],
                                        "open": candle['open'],
                                        "high": candle['high'],
                                        "low": candle['low'],
                                        "close": candle['close'],
                                        "volume": candle['volume'],
                                        "close_time": candle['close_time']
                                    })

                        except Exception as e:
                            logger.error(f"Error parsing WS message: {e}")
            except Exception as e:
                logger.error(f"WS connection error ({uri}): {e}")
                await asyncio.sleep(backoff)
                backoff = min(backoff * 2, 60)

    async def _log_interval_stats(self):
        while self._running:
            logger.info(f"[{datetime.utcnow()}] Interval stats: {self.interval_stats}")
            await asyncio.sleep(60)  # In log mỗi phút

    def start(self):
        self._running = True
        self._task = asyncio.create_task(self._connect_and_consume())

    def stop(self):
        self._running = False
        if self._task:
            self._task.cancel()
            self._task = None
