import asyncio
import websockets
import json
import logging
from datetime import datetime
from app.config import settings, SYMBOL_WHITELIST
from app.storage.redis_client import redis_client
from app.storage.influx_client import influx_writer
from app.services.broadcast import price_stream, candle_stream, market_snapshot_stream, top_movers_stream
from app.services.price_service import price_service

# from app.services.kafka_producer import kafka_producer


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
                                    
                                    # # Gửi price update đến Kafka
                                    # await kafka_producer.send_price_update(
                                    #     candle['symbol'],
                                    #     {
                                    #         "price": candle['close'],
                                    #         "timestamp": candle['close_time'],
                                    #         "volume": candle['volume']
                                    #     }
                                    # )

                                # Nếu nến đóng (x=True)
                                if k['x'] is True:
                                    key = f"{candle['symbol']}-{candle['interval']}"
                                    interval_ms = self._interval_to_milliseconds(candle['interval'])

                                    # Lấy _last_candle_time từ Redis thay vì chỉ dùng memory
                                    _last_candle_time = await redis_client.get_last_candle_time(candle['symbol'],candle['interval'])
                                    _last_candle_time = int(_last_candle_time) if _last_candle_time else None
                             

                                    if _last_candle_time and candle['close_time'] > _last_candle_time + 2*interval_ms:
                                        # GAP DETECTED 🚨
                                        from_time = _last_candle_time
                                        to_time = candle['close_time'] - interval_ms
                                        asyncio.create_task(
                                            price_service.fill_missing_candles(
                                                candle['symbol'],
                                                candle['interval'],
                                                from_time,
                                                to_time
                                            )
                                        )

                                    # Update thống kê interval
                                    self.interval_stats[candle['interval']] = self.interval_stats.get(candle['interval'], 0) + 1

                                    # Lưu vào Redis (list + _last_candle_time) và Influx
                                    await redis_client.lpush_candle(
                                        candle['interval'], candle['symbol'], candle,
                                        maxlen=settings.CANDLES_LIST_MAX
                                    )
                                    await redis_client.append_stream(
                                        'stream:price_events',
                                        {'candle': json.dumps(candle), 'symbol': candle['symbol']}
                                    )
                                    await influx_writer.write_batch([candle])
                                    logger.info(
                                        f"Saved candle for {candle['symbol']} {candle['interval']} at {candle['close_time']}"
                                    )

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

    async def _consume_market_snapshot_ws(self, symbols=None):
        """
        Lấy snapshot realtime cho danh sách symbol truyền vào
        Nếu symbols=None, lấy toàn bộ SYMBOL_WHITELIST
        """
        symbol_list = symbols or SYMBOL_WHITELIST
        # Tạo stream URI theo từng symbol
        streams = "/".join(f"{s.lower()}@miniTicker" for s in symbol_list)
        uri = f"{self.url}/stream?streams={streams}"
        backoff = 1

        while self._running:
            try:
                async with websockets.connect(uri, ping_interval=20, close_timeout=5) as ws:
                    backoff = 1
                    async for msg in ws:
                        try:
                            data = json.loads(msg)
                            # Binance trả về {'stream': 'btcusdt@miniTicker', 'data': {...}}
                            ticker = data.get("data", {})
                            symbol = ticker.get("s")
                            if not symbol:
                                continue

                            last_price = float(ticker["c"])
                            open_price = float(ticker["o"])
                            price_change_percent = ((last_price - open_price) / open_price) * 100
                            snapshot = {
                                "symbol": symbol,
                                "last_price": last_price,
                                "price_change_percent": price_change_percent,
                                "volume": float(ticker["v"]),
                            }
                            await market_snapshot_stream.broadcast(snapshot)
                        except Exception as e:
                            logger.error(f"Error parsing market snapshot WS: {e}")
            except Exception as e:
                logger.error(f"Market snapshot WS error: {e}")
                await asyncio.sleep(backoff)
                backoff = min(backoff * 2, 60)


    async def _consume_top_movers_ws(self, limit: int = 10):
        """
        Top movers realtime (gainers/losers)
        """
        if not hasattr(self, "_ticker_cache"):
            self._ticker_cache = {}

        uri = f"{self.url}/stream?streams=!ticker@arr"
        backoff = 1

        while self._running:
            try:
                async with websockets.connect(uri, ping_interval=20, close_timeout=5) as ws:
                    backoff = 1
                    async for msg in ws:
                        try:
                            data = json.loads(msg)
                            tickers = data.get("data", [])
                            if isinstance(tickers, dict):
                                tickers = [tickers]

                            for t in tickers:
                                if "s" not in t or "P" not in t:
                                    continue
                                self._ticker_cache[t["s"]] = t

                            tickers_list = list(self._ticker_cache.values())
                            gainers = sorted([t for t in tickers_list if float(t["P"])>0], key=lambda x: float(x["P"]), reverse=True)[:limit]
                            losers = sorted([t for t in tickers_list if float(t["P"])<0], key=lambda x: float(x["P"]))[:limit]

                            movers = {
                                "top_gainers":[{"symbol": t["s"], "last_price": float(t["c"]), "price_change_percent": float(t["P"]), "volume": float(t["v"])} for t in gainers],
                                "top_losers":[{"symbol": t["s"], "last_price": float(t["c"]), "price_change_percent": float(t["P"]), "volume": float(t["v"])} for t in losers]
                            }

                            await top_movers_stream.broadcast(movers)

                        except Exception as e:
                            logger.error(f"Error parsing top movers WS: {e}")
            except Exception as e:
                logger.error(f"Top movers WS error: {e}")
                await asyncio.sleep(backoff)
                backoff = min(backoff*2, 60)


    def _interval_to_milliseconds(self, interval: str) -> int:
        if not interval or len(interval) < 2:
            return 0

        unit = interval[-1]
        try:
            amount = int(interval[:-1])
        except ValueError:
            return 0

        unit_multipliers = {
            'm': 60 * 1000,                   # phút
            'h': 60 * 60 * 1000,              # giờ
            'd': 24 * 60 * 60 * 1000,         # ngày
            'w': 7 * 24 * 60 * 60 * 1000,     # tuần
            'M': 30 * 24 * 60 * 60 * 1000,    # tháng (30 ngày)
            'y': 365 * 24 * 60 * 60 * 1000,   # năm (365 ngày)
        }

        return amount * unit_multipliers.get(unit, 0)


    async def _log_interval_stats(self):
        while self._running:
            logger.info(f"[{datetime.utcnow()}] Interval stats: {self.interval_stats}")
            await asyncio.sleep(60)  # In log mỗi phút

    def start_all(self):
        """
        Khởi chạy tất cả các task WS và snapshot/top movers
        """
        self._running = True
        self._task = asyncio.create_task(self._connect_and_consume())
        self._snapshot_task = asyncio.create_task(self._consume_market_snapshot_ws())
        self._top_movers_task = asyncio.create_task(self._consume_top_movers_ws())


    def stop_all(self):
        self._running = False
        for t in [self._task, getattr(self, "_snapshot_task", None), getattr(self, "_top_movers_task", None)]:
            if t:
                t.cancel()