import logging
from fastapi import FastAPI
from app.config import settings, SYMBOL_WHITELIST
from app.storage.redis_client import redis_client
from app.storage.influx_client import influx_writer
from app.routes.candles import router as candles_router
from app.routes.ws import router as ws_router  # <-- router WebSocket mới
from app.services.ws_manager import WSManager

# # Cấu hình logging
# logging.basicConfig(
#     level=logging.INFO,  # bật log INFO trở lên
#     format="%(asctime)s - %(levelname)s - %(name)s - %(message)s"
# )

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

    # WSManager sẽ quản lý 1 kết nối WS đến Binance cho tất cả symbol + intervals
    app.state.ws_manager = WSManager(intervals=["1m", "5m", "15m", "1h", "5h"])
    app.state.ws_manager.start()

@app.on_event("shutdown")
async def shutdown():
    await redis_client.close()
    await influx_writer.close()
    app.state.ws_manager.stop()

# REST API
app.include_router(candles_router, prefix="/api")

# WebSocket API
app.include_router(ws_router)  # không prefix để frontend gọi ws://host/ws/price
