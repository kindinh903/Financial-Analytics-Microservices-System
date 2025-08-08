# main.py
from fastapi import FastAPI
from app.config import settings, SYMBOL_WHITELIST
from app.storage.redis_client import redis_client
from app.storage.influx_client import influx_writer
from app.routes.candles import router as candles_router
from app.services.ws_manager import WSManager  # import class

app = FastAPI(title="price-service")

@app.on_event("startup")
async def startup():
    await redis_client.init(settings.REDIS_URL)
    await influx_writer.init(
        settings.INFLUX_URL,
        settings.INFLUX_TOKEN,
        settings.INFLUX_ORG,
        settings.INFLUX_BUCKET
    )

    # Tạo WSManager mới
    app.state.ws_manager = WSManager()

    # Start WebSocket cho từng symbol
    for symbol in SYMBOL_WHITELIST:
        stream = {"stream": f"{symbol.lower()}@kline_1m"}
        app.state.ws_manager.start(stream)

@app.on_event("shutdown")
async def shutdown():
    await redis_client.close()
    await influx_writer.close()
    app.state.ws_manager.stop()

app.include_router(candles_router, prefix="/api")
