
# =========================
# src/app/storage/influx_client.py
# =========================
import asyncio
from influxdb_client import InfluxDBClient, Point, WriteOptions
from typing import List
from datetime import datetime

class InfluxWriter:
    def __init__(self):
        self.client: InfluxDBClient | None = None
        self.write_api = None
        self.query_api = None
        self.org = None
        self.bucket = None

    async def init(self, url: str, token: str, org: str, bucket: str):
        self.client = InfluxDBClient(url=url, token=token, org=org)
        self.write_api = self.client.write_api(
            write_options=WriteOptions(
                batch_size=100,
                flush_interval=3000,
                jitter_interval=0,
                retry_interval=5000,
                max_retries=5,
                max_retry_delay=30000,
                exponential_base=2
            )
        )
        self.query_api = self.client.query_api()
        self.org = org
        self.bucket = bucket

    async def close(self):
        if self.client:
            self.client.close()

    def _point_from_candle(self, c: dict) -> Point:
        measurement = f"candles_{c['interval']}"  # measurement riêng cho interval
        p = Point(measurement)
        p = p.tag("symbol", c["symbol"]) \
             .field("open", float(c["open"])) \
             .field("high", float(c["high"])) \
             .field("low", float(c["low"])) \
             .field("close", float(c["close"])) \
             .field("volume", float(c["volume"]))
        
        dt = datetime.utcfromtimestamp(int(c["close_time"]) / 1000)
        p = p.time(dt)
        return p

    async def write_batch(self, candles: List[dict]):
        if not candles:
            return
        points = [self._point_from_candle(c) for c in candles]
        self.write_api.write(bucket=self.bucket, org=self.org, record=points)

    async def query_candles_from_DB(self, symbol, interval, limit, start_time=None, end_time=None):
        measurement = f"candles_{interval}"
        if start_time:
            time_filter = f'  |> range(start: {start_time-10}ms'
            if end_time:
                time_filter += f', stop: {end_time+10}ms'
            time_filter += ')'
        else:
            time_filter = '  |> range(start: -30d)'

        query = f'''
        from(bucket: "{self.bucket}")
        {time_filter}
          |> filter(fn: (r) => r["_measurement"] == "{measurement}" and r["symbol"] == "{symbol}")
          |> sort(columns: ["_time"], desc: true)
        '''

        tables = self.query_api.query(query)

        candles = {}
        for table in tables:
            for row in table.records:
                ts = int(row['_time'].timestamp() * 1000)
                if ts not in candles:
                    candles[ts] = {
                        'symbol': row['symbol'],
                        'interval': interval,
                        'close_time': ts
                    }
                candles[ts][row['_field']] = row['_value']

        results = list(candles.values())
        results.sort(key=lambda c: c['close_time'], reverse=True)
        return results[:limit]

    async def query_candles(self, symbol, interval, limit, start_time=None, end_time=None):
        measurement = f"candles_{interval}"
        if start_time:
            time_filter = f'  |> range(start: {start_time-10}ms'
            if end_time:
                time_filter += f', stop: {end_time+10}ms'
            time_filter += ')'
        else:
            time_filter = '  |> range(start: -30d)'

        query = f'''
        from(bucket: "{self.bucket}")
        {time_filter}
          |> filter(fn: (r) => r["_measurement"] == "{measurement}" and r["symbol"] == "{symbol}")
          |> sort(columns: ["_time"], desc: true)
          |> limit(n: {limit*5})
        '''

        tables = self.query_api.query(query)

        candles = {}
        for table in tables:
            for row in table.records:
                ts = int(row['_time'].timestamp() * 1000)
                if ts not in candles:
                    candles[ts] = {
                        'symbol': row['symbol'],
                        'interval': interval,
                        'close_time': ts
                    }
                candles[ts][row['_field']] = row['_value']

        results = list(candles.values())
        results.sort(key=lambda c: c['close_time'], reverse=True)
        return results[:limit]

influx_writer = InfluxWriter()
