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
        
    async def get_candles(self, symbol: str, interval: str, limit: int = 20,
                        start_time: int | None = None, end_time: int | None = None) -> List[dict]:
        print(f"[get_candles] symbol={symbol}, interval={interval}, limit={limit}, start_time={start_time}, end_time={end_time}")

        # Step 1: Redis cache
        cached = await self.redis.get_candles_list(interval, symbol, 0, -1)
        print(f"[get_candles] Redis cached: {len(cached) if cached else 0} items")

        filtered = []
        if cached:
            filtered = cached
            if start_time or end_time:
                filtered = [c for c in cached if (not start_time or c['close_time'] >= start_time)
                            and (not end_time or c['close_time'] <= end_time)]
            print(f"[get_candles] Filtered candles from Redis: {len(filtered)} items")

            if len(filtered) >= limit:
                return filtered[:limit]

        # Step 2: Influx query
        influx_data = await self.influx.query_candles(symbol, interval, limit, start_time, end_time)
        print(f"[get_candles] Influx data: {len(influx_data) if influx_data else 0} items")

        if influx_data:
            # Merge Redis + Influx, tránh trùng close_time
            combined = {c['close_time']: c for c in filtered}
            for c in influx_data:
                combined[c['close_time']] = c
            merged_list = sorted(combined.values(), key=lambda x: x['close_time'], reverse=True)
            print(f"[get_candles] Combined Redis+Influx: {len(merged_list)} items")
            if len(merged_list) >= limit:
                return merged_list[:limit]
            filtered = merged_list

        # Step 3: Fetch từ Binance nếu vẫn thiếu
        missing_count = limit - len(filtered)
        print(f"[get_candles] Missing candles: {missing_count}")

        start_time_fetch = start_time
        if missing_count > 0 and not start_time:
            if filtered:
                interval_ms = self._interval_to_milliseconds(interval)
                oldest_time = min(c['close_time'] for c in filtered)
                start_time_fetch = oldest_time - (missing_count * interval_ms)
                print(f"[get_candles] Calculated start_time_fetch={start_time_fetch} from oldest_time={oldest_time}")
            else:
                start_time_fetch = None  # sẽ lấy theo limit mặc định

        existing_close_times = {c['close_time'] for c in filtered}
        print(f"[get_candles] Existing close times count: {len(existing_close_times)}")

        klines = await fetch_klines(symbol, interval, limit=missing_count or limit,
                                    start_time=start_time_fetch, end_time=end_time)
        print(f"[get_candles] Binance klines fetched: {len(klines)} items")

        # Lọc nến mới tránh trùng
        new_klines = [k for k in klines if k['close_time'] not in existing_close_times]
        print(f"[get_candles] New klines after dedup: {len(new_klines)} items")

        # Lưu Redis & Influx
        for c in new_klines:
            await self.save_candle(symbol, interval, c, persist_influx=False)
        if new_klines:
            await self.influx.write_batch(new_klines)

        # Kết hợp dữ liệu cuối cùng
        combined = {c['close_time']: c for c in filtered}
        for c in new_klines:
            combined[c['close_time']] = c
        final_list = sorted(combined.values(), key=lambda x: x['close_time'], reverse=True)
        print(f"[get_candles] Final merged list: {len(final_list)} items")

        return final_list[:limit]


    def _interval_to_milliseconds(self, interval: str) -> int:
        unit = interval[-1]
        amount = int(interval[:-1])
        if unit == 'm':
            return amount * 60 * 1000
        elif unit == 'h':
            return amount * 60 * 60 * 1000
        elif unit == 'd':
            return amount * 24 * 60 * 60 * 1000
        else:
            return 0

    async def save_candle(self, symbol: str, interval: str, candle: dict, persist_influx: bool = True):
        # store to Redis list and stream
        print(f"[save_candle] symbol={symbol}, interval={interval}, close_time={candle.get('close_time')}")
        await self.redis.lpush_candle(interval, symbol, candle, maxlen=settings.CANDLES_LIST_MAX)
        await self.redis.append_stream("stream:price_events", {"candle": json_dumps(candle), "symbol": symbol})
        if persist_influx:
            await self.influx.write_batch([candle])

    async def get_realtime_price(self, symbol: str):
        print(f"[get_realtime_price] symbol={symbol}")
        return await self.redis.get_realtime(symbol)

    async def update_realtime_price(self, symbol: str, price: float, timestamp: int):
        print(f"[update_realtime_price] symbol={symbol}, price={price}, timestamp={timestamp}")
        obj = {"symbol": symbol, "price": price, "timestamp": timestamp}
        await self.redis.set_realtime(symbol, obj, ttl=3600)


import json

def json_dumps(o):
    return json.dumps(o, separators=(",", ":"))

price_service = PriceService()
