
# =========================
# src/app/storage/influx_client.py
# =========================
import asyncio
from influxdb_client import InfluxDBClient, Point, WriteOptions
from typing import List

class InfluxWriter:
    def __init__(self):
        self.client: InfluxDBClient | None = None
        self.write_api = None
        self.org = None
        self.bucket = None

    async def init(self, url: str, token: str, org: str, bucket: str):
        # init is sync API; client is blocking so we keep sync write_api but call in executor
        self.client = InfluxDBClient(url=url, token=token, org=org)
        self.write_api = self.client.write_api(write_options=WriteOptions(batch_size=500, flush_interval=1000))
        self.org = org
        self.bucket = bucket

    async def close(self):
        if self.client:
            self.client.close()

    def _point_from_candle(self, c: dict) -> Point:
        p = Point("candles")
        p = p.tag("symbol", c["symbol"]).tag("interval", c["interval"]) \
            .field("open", float(c["open"])) .field("high", float(c["high"])) \
            .field("low", float(c["low"])) .field("close", float(c["close"])) \
            .field("volume", float(c["volume"]))
        # Influx expects ns or RFC3339; we will pass ms and let client handle
        p = p.time(int(c["close_time"]))
        return p

    async def write_batch(self, candles: List[dict]):
        if not candles:
            return
        points = [self._point_from_candle(c) for c in candles]
        loop = asyncio.get_running_loop()
        # run blocking write in executor to not block async loop
        await loop.run_in_executor(None, lambda: self.write_api.write(bucket=self.bucket, org=self.org, record=points))


influx_writer = InfluxWriter()