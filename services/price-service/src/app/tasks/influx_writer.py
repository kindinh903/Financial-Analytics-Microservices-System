# =========================
# src/app/tasks/influx_writer.py
# =========================
import asyncio
import json
from app.storage.redis_client import redis_client
from app.storage.influx_client import influx_writer

async def influx_consumer_loop(stream_key: str = 'stream:price_events', group: str = 'influx-writers', consumer: str = 'c1'):
    await redis_client.xgroup_create(stream_key, group)
    while True:
        messages = await redis_client.xreadgroup(stream_key, group, consumer, count=500, block=2000)
        if not messages:
            await asyncio.sleep(0.1)
            continue
        ids_to_ack = []
        candles = []
        for stream_name, entries in messages:
            for entry_id, data in entries:
                try:
                    candle = json.loads(data['candle'])
                    candles.append(candle)
                    ids_to_ack.append(entry_id)
                except Exception:
                    # handle parse error
                    pass
        if candles:
            try:
                await influx_writer.write_batch(candles)
                if ids_to_ack:
                    await redis_client.xack(stream_key, group, ids_to_ack)
            except Exception:
                # on failure, do not ack -> will retry
                await asyncio.sleep(1)