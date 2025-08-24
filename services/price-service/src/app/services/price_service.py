# =========================
# src/app/services/price_service.py
# =========================
import asyncio
from datetime import datetime
from typing import List, Optional
from app.storage.redis_client import redis_client
from app.storage.influx_client import influx_writer
from app.utils.binance_api import fetch_klines, fetch_market_snapshot, fetch_top_movers
from app.config import settings, SYMBOL_WHITELIST, INTERVALS
import logging

logger = logging.getLogger(__name__)


class PriceService:
    def __init__(self):
        self.redis = redis_client
        self.influx = influx_writer

    async def get_candles(
            self, symbol: str, interval: str, limit: int = 20,
            start_time: int | None = None, end_time: int | None = None
        ) -> List[dict]:
            print(f"[get_candles] symbol={symbol}, interval={interval}, limit={limit}, "
                f"start_time={start_time}, end_time={end_time}")

            # Step 1: Redis
            cached = await self._get_from_redis(symbol, interval, start_time, end_time)
            if len(cached) >= limit:
                return cached[:limit]

            # Step 2: Influx
            influx_data = await self._get_from_influx(symbol, interval, limit, start_time, end_time)
            merged = self._merge_candles(cached, influx_data)
            if len(merged) >= limit:
                return merged[:limit]

            # Step 3: Binance
            final_list = await self._fetch_from_binance(
                symbol, interval, merged, limit, start_time, end_time
            )
            return final_list[:limit]

    async def get_market_snapshot(self, symbol_list: list[str]):
        """
        Lấy snapshot cho nhiều cặp coin, nhưng chỉ lấy các symbol nằm trong SYMBOL_WHITELIST
        """
        # lọc chỉ lấy các symbol hợp lệ
        filtered_symbols = [s for s in symbol_list if s in SYMBOL_WHITELIST]

        if not filtered_symbols:
            return []

        # gọi tới Binance API để lấy dữ liệu snapshot
        data = await fetch_market_snapshot(filtered_symbols)
        return data

    async def get_top_movers(self, limit: int = 10):
        """
        Lấy top gainers và losers (24h) nhưng chỉ cho các symbol trong SYMBOL_WHITELIST
        """
        data = await fetch_top_movers(limit)

        # Lọc lại gainers và losers theo SYMBOL_WHITELIST
        gainers = [item for item in data["top_gainers"] if item["symbol"] in SYMBOL_WHITELIST]
        losers = [item for item in data["top_losers"] if item["symbol"] in SYMBOL_WHITELIST]
        
        if not gainers and not losers:
            return data  # fallback full Binance data

        return {
            "top_gainers": gainers,
            "top_losers": losers
        }



    def _interval_to_milliseconds(self, interval: str) -> int:
        if not interval or len(interval) < 2:
            return 0

        unit = interval[-1]
        try:
            amount = int(interval[:-1])
        except ValueError:
            return 0

        unit_multipliers = {
            'm': 60 * 1000,              # phút
            'h': 60 * 60 * 1000,         # giờ
            'd': 24 * 60 * 60 * 1000,    # ngày
            'w': 7 * 24 * 60 * 60 * 1000, # tuần
            'M': 30 * 24 * 60 * 60 * 1000,  # tháng (30 ngày)
            'y': 365 * 24 * 60 * 60 * 1000, # năm (365 ngày)
        }

        return amount * unit_multipliers.get(unit, 0)


    async def save_candle(self, symbol: str, interval: str, candle: dict, persist_influx: bool = True):
        # store to Redis list and stream
        print(f"[save_candle] symbol={symbol}, interval={interval}, close_time={candle.get('close_time')}")
        await self.redis.lpush_candle(interval, symbol, candle, maxlen=settings.CANDLES_LIST_MAX)
        print(f"[DEBUG] save_candle -> key=candles:list:{interval}:{symbol}")

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

    async def _get_from_redis(self, symbol: str, interval: str,
                              start_time: int | None, end_time: int | None) -> List[dict]:
        cached = await self.redis.get_candles_list(interval, symbol, 0, -1) or []
        print(f"[get_candles] Redis cached: {len(cached)} items")

        if start_time or end_time:
            cached = [
                c for c in cached
                if (not start_time or c['close_time'] >= start_time)
                and (not end_time or c['close_time'] <= end_time)
            ]
        print(f"[get_candles] Filtered Redis candles: {len(cached)} items")
        return sorted(cached, key=lambda x: x['close_time'], reverse=True)

    async def _get_from_influx(self, symbol: str, interval: str, limit: int,
                               start_time: int | None, end_time: int | None) -> List[dict]:
        influx_data = await self.influx.query_candles(symbol, interval, limit, start_time, end_time) or []
        print(f"[get_candles] Influx data: {len(influx_data)} items")
        return influx_data

    def _merge_candles(self, redis_data: List[dict], influx_data: List[dict]) -> List[dict]:
        combined = {}
        for c in influx_data:
            combined[c['close_time']] = c
        for c in redis_data:
            combined[c['close_time']] = c  # ưu tiên Redis
        merged = sorted(combined.values(), key=lambda x: x['close_time'], reverse=True)
        print(f"[get_candles] Combined Redis+Influx: {len(merged)} items")
        return merged

    async def _fetch_from_binance(
        self, symbol: str, interval: str, merged_list: List[dict],
        limit: int, start_time: int | None, end_time: int | None
    ) -> List[dict]:
    
        missing = limit - len(merged_list)
        print(f"[get_candles] Missing candles: {missing}")

        fetch_mode = "window" if (start_time or end_time) else "older"
        existing_close_times = {c['close_time'] for c in merged_list}
        oldest_time = min((c['close_time'] for c in merged_list), default=None)
        end_time_fetch = (oldest_time - 1 if fetch_mode == "older" and oldest_time else end_time)

        attempts, max_attempts = 0, 5
        combined = {c['close_time']: c for c in merged_list}

        while missing > 0 and attempts < max_attempts:
            fetch_limit = min(max(missing * 2, missing), 1000)
            print(f"[get_candles] Fetch attempt {attempts+1}: fetch_limit={fetch_limit}, "
                  f"end_time_fetch={end_time_fetch}, start_time={start_time}")

            if fetch_mode == "window":
                klines = await fetch_klines(symbol, interval, fetch_limit, start_time, end_time)
            else:
                klines = await fetch_klines(symbol, interval, fetch_limit, None, end_time_fetch)

            print(f"[get_candles] Binance klines fetched: {len(klines)} items")
            if not klines:
                break

            new_unique = [k for k in klines if k['close_time'] not in existing_close_times]
            print("[DEBUG] Before save_candle, new_unique count:", len(new_unique))

            print(f"[get_candles] New unique klines: {len(new_unique)}")

            if not new_unique:
                if fetch_mode == "older":
                    end_time_fetch = min(k['close_time'] for k in klines) - 1
                    attempts += 1
                    continue
                break

            # Không lưu vào redis để tránh xoá mất dữ liệu realtime gần nhất
            # for c in new_unique:
            #     await self.save_candle(symbol, interval, c, persist_influx=False)
            await self.influx.write_batch(new_unique)

            for c in new_unique:
                existing_close_times.add(c['close_time'])
                combined[c['close_time']] = c

            merged_list = sorted(combined.values(), key=lambda x: x['close_time'], reverse=True)
            missing = limit - len(merged_list)
            if fetch_mode == "older":
                end_time_fetch = min(c['close_time'] for c in new_unique) - 1
            attempts += 1

        final_list = sorted(combined.values(), key=lambda x: x['close_time'], reverse=True)
        print(f"[get_candles] Final merged list: {len(final_list)} items")
        return final_list


    async def fill_missing_candles(self, symbol: str, interval: str, from_time: int, to_time: int):
        """
        Fetch lại candles từ Binance để lấp gap  
        """
        logger.warning(
            f"[GAP-DETECTED] Fetching missing candles {symbol}-{interval} "
            f"from {from_time} to {to_time}"
        )

        interval_ms = self._interval_to_milliseconds(interval)
        current_start = from_time
        all_candles = []
        max_limit = 1000  # Binance giới hạn tối đa 1000 nến mỗi request

        while current_start < to_time:
            fetch_limit = min(max_limit, (to_time - current_start) // interval_ms + 1)
            klines = await fetch_klines(symbol, interval, fetch_limit, current_start, to_time)
            if not klines:
                break  # Không còn dữ liệu

            all_candles.extend(klines)

            # Cập nhật start_time cho batch tiếp theo
            last_close_time = klines[-1]["close_time"]
            current_start = last_close_time + interval_ms

            # Tránh loop quá nhanh gây rate limit
            await asyncio.sleep(0.1)

        if all_candles:
            # Lưu batch vào Influx
            await self.influx.write_batch(all_candles)

            # Lưu vào Redis qua save_candle nhưng persist_influx=False để không ghi lại Influx
            for c in all_candles:
                await self.save_candle(symbol, interval, c, persist_influx=False)

        logger.info(f"✅ Filled {len(all_candles)} missing candles for {symbol}-{interval}")
        return all_candles
    



import json

def json_dumps(o):
    return json.dumps(o, separators=(",", ":"))

price_service = PriceService()
