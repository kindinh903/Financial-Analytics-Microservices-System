# =========================
# src/app/main.py
# =========================
from fastapi import FastAPI
from app.config import settings
from app.storage.redis_client import redis_client
from app.storage.influx_client import influx_writer
from app.routes.candles import router as candles_router

app = FastAPI(title="price-service")

@app.on_event("startup")
async def startup():
    await redis_client.init(settings.REDIS_URL)
    await influx_writer.init(settings.INFLUX_URL, settings.INFLUX_TOKEN, settings.INFLUX_ORG, settings.INFLUX_BUCKET)

@app.on_event("shutdown")
async def shutdown():
    await redis_client.close()
    await influx_writer.close()

app.include_router(candles_router, prefix="/api")
