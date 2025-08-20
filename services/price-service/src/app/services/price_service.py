# =========================
# src/app/services/price_service.py
# =========================
from typing import List, Optional
from app.storage.redis_client import redis_client
from app.storage.influx_client import influx_writer
from app.utils.binance_api import fetch_klines, fetch_market_snapshot, fetch_top_movers
from app.config import settings, SYMBOL_WHITELIST

class PriceService:
    def __init__(self):
        self.redis = redis_client
        self.influx = influx_writer


    async def get_candles(self, symbol: str, interval: str, limit: int = 20,
                        start_time: int | None = None, end_time: int | None = None) -> List[dict]:
        print(f"[get_candles] symbol={symbol}, interval={interval}, limit={limit}, start_time={start_time}, end_time={end_time}")

        # Step 1: Redis (lấy tất cả cached; Redis lưu mới nhất ở đầu)
        cached = await self.redis.get_candles_list(interval, symbol, 0, -1) or []
        print(f"[get_candles] Redis cached: {len(cached)} items")

        # Áp filter thời gian nếu có
        filtered = cached
        if start_time or end_time:
            filtered = [
                c for c in cached
                if (not start_time or c['close_time'] >= start_time)
                and (not end_time or c['close_time'] <= end_time)
            ]

        print(f"[get_candles] Filtered Redis candles: {len(filtered)} items")
        filtered = sorted(filtered, key=lambda x: x['close_time'], reverse=True)

        # Nếu đã đủ thì return luôn
        if len(filtered) >= limit:
            print(f"[get_candles] Enough data from cache/influx -> returning {limit}")
            return filtered[:limit]


        # Step 2: Influx
        influx_data = await self.influx.query_candles(symbol, interval, limit, start_time, end_time) or []
        print(f"[get_candles] Influx data: {len(influx_data)} items")

        # Merge Redis + Influx -> union, ưu tiên Redis (thêm Influx trước, rồi Redis đè lên)
        combined = {}
        for c in influx_data:
            combined[c['close_time']] = c
        for c in filtered:
            combined[c['close_time']] = c  # Redis ưu tiên nếu trùng key
        merged_list = sorted(combined.values(), key=lambda x: x['close_time'], reverse=True)
        print(f"[get_candles] Combined Redis+Influx: {len(merged_list)} items")

        # Nếu đã đủ thì return luôn
        if len(merged_list) >= limit:
            print(f"[get_candles] Enough data from cache/influx -> returning {limit}")
            return merged_list[:limit]

        # Step 3: Fetch thêm từ Binance nếu thiếu
        missing = limit - len(merged_list)
        print(f"[get_candles] Missing candles: {missing}")

        # Prepare for iterative fetch to avoid overlaps and handle partial duplicates
        interval_ms = self._interval_to_milliseconds(interval)
        # Nếu caller truyền start_time/end_time thì tôn trọng (fetch inside that window).
        # Nếu không, muốn fetch older candles -> set end_time_fetch = oldest_time - 1
        if start_time or end_time:
            # We'll fetch forward within user's window; start with missing, may loop if duplicates
            fetch_mode = "window"
        else:
            fetch_mode = "older"

        existing_close_times = set(combined.keys())
        print(f"[get_candles] Existing close times count: {len(existing_close_times)}")

        # iterative fetch
        attempts = 0
        max_attempts = 5
        # If we want older, start from oldest known time
        if merged_list:
            oldest_time = min(c['close_time'] for c in merged_list)
        else:
            oldest_time = None

        # compute initial end_time_fetch for older case
        if fetch_mode == "older" and oldest_time is not None:
            end_time_fetch = oldest_time - 1
        else:
            end_time_fetch = end_time

        while missing > 0 and attempts < max_attempts:
            # choose fetch_limit: try to fetch more than missing to account for overlaps
            fetch_limit = min(max(missing * 2, missing), 1000)
            print(f"[get_candles] Fetch attempt {attempts+1}: fetch_limit={fetch_limit}, end_time_fetch={end_time_fetch}, start_time={start_time}")

            if fetch_mode == "window":
                # respecting provided window -> use start_time/end_time provided
                klines = await fetch_klines(symbol, interval, limit=fetch_limit, start_time=start_time, end_time=end_time)
            else:
                # fetch older than end_time_fetch (if end_time_fetch is None, get latest)
                if end_time_fetch is not None:
                    klines = await fetch_klines(symbol, interval, limit=fetch_limit, start_time=None, end_time=end_time_fetch)
                else:
                    klines = await fetch_klines(symbol, interval, limit=fetch_limit, start_time=None, end_time=None)

            print(f"[get_candles] Binance klines fetched: {len(klines)} items")

            if not klines:
                print("[get_candles] Binance returned no klines -> break")
                break

            # Find new unique ones (by close_time)
            new_unique = [k for k in klines if k['close_time'] not in existing_close_times]
            print(f"[get_candles] New unique klines from this fetch: {len(new_unique)} items")

            # If nothing new, move the window older and retry (avoid infinite loop)
            if not new_unique:
                if fetch_mode == "older":
                    # move end_time_fetch to before the earliest returned kline and retry
                    min_k_ts = min(k['close_time'] for k in klines)
                    end_time_fetch = min_k_ts - 1
                    print(f"[get_candles] No new unique items -> shift end_time_fetch to {end_time_fetch} and retry")
                    attempts += 1
                    continue
                else:
                    # in window mode and no new unique -> break
                    print("[get_candles] Window fetch but no new unique items -> break")
                    break

            # Save new uniques (Redis + stream) and write to Influx (batch)
            for c in new_unique:
                await self.save_candle(symbol, interval, c, persist_influx=False)
            if new_unique:
                await self.influx.write_batch(new_unique)
                print(f"[get_candles] Wrote {len(new_unique)} new klines to Influx")

            # Add to combined / existing_close_times
            for c in new_unique:
                existing_close_times.add(c['close_time'])
                combined[c['close_time']] = c

            # Recompute merged list + missing
            merged_list = sorted(combined.values(), key=lambda x: x['close_time'], reverse=True)
            missing = limit - len(merged_list)
            print(f"[get_candles] After merge, total={len(merged_list)}, still missing={missing}")

            # For older fetch mode, set end_time_fetch to before the earliest new_unique close_time
            if fetch_mode == "older":
                end_time_fetch = min(c['close_time'] for c in new_unique) - 1

            attempts += 1

        # Final result (may still be < limit if no more historical data)
        final_list = sorted(combined.values(), key=lambda x: x['close_time'], reverse=True)
        print(f"[get_candles] Final merged list: {len(final_list)} items (returning up to {limit})")
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
