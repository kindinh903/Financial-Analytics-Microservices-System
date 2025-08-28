# import asyncio
# import json
# from aiokafka import AIOKafkaConsumer, AIOKafkaProducer
# from app.config import settings
# from app.redis_buffer import push_candle, get_candles
# from app.predictor import Predictor

# predictor = Predictor()

# async def start_workers():
#     consumer_price = AIOKafkaConsumer(
#         settings.PRICE_TOPIC,
#         bootstrap_servers=settings.KAFKA_BOOTSTRAP,
#         group_id=settings.KAFKA_GROUP,
#         value_deserializer=lambda v: json.loads(v.decode())
#     )
#     consumer_sent = AIOKafkaConsumer(
#         settings.SENT_TOPIC,
#         bootstrap_servers=settings.KAFKA_BOOTSTRAP,
#         group_id=settings.KAFKA_GROUP + "-sent",
#         value_deserializer=lambda v: json.loads(v.decode())
#     )
#     producer = AIOKafkaProducer(
#         bootstrap_servers=settings.KAFKA_BOOTSTRAP,
#         value_serializer=lambda v: json.dumps(v).encode()
#     )

#     await consumer_price.start()
#     await consumer_sent.start()
#     await producer.start()

#     latest_sent = {}

#     async def handle_sent():
#         async for msg in consumer_sent:
#             s = msg.value
#             key = (s.get('symbol'), s.get('interval'))
#             latest_sent[key] = s

#     async def handle_price():
#         async for msg in consumer_price:
#             p = msg.value
#             sym = p.get('symbol'); interval = p.get('interval')
#             # guard: only process whitelisted symbols
#             if sym not in settings.SYMBOL_WHITELIST:
#                 continue
#             push_candle(sym, interval, p)
#             candles = get_candles(sym, interval, n=settings.SEQ_LEN)
#             if len(candles) < 16:
#                 continue
#             sent = latest_sent.get((sym, interval))
#             try:
#                 res = predictor.predict_from_candles(sym, interval, candles, sentiment=sent)
#                 # publish result
#                 await producer.send_and_wait(settings.PRED_TOPIC, res)
#             except Exception as e:
#                 print("prediction error", e)

#     await asyncio.gather(handle_sent(), handle_price())
