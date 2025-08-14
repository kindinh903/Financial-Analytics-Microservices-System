from contextlib import asynccontextmanager
from fastapi import FastAPI
from app.config import settings, SYMBOL_WHITELIST
from app.storage.redis_client import redis_client
from app.storage.influx_client import influx_writer
from app.routes.api import router as api_router
from app.routes.ws import router as ws_router
from app.services.ws_manager import WSManager
import logging
import uvicorn

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(name)s - %(message)s"
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    await redis_client.init(settings.REDIS_URL)
    await influx_writer.init(
        settings.INFLUX_URL,
        settings.INFLUX_TOKEN,
        settings.INFLUX_ORG,
        settings.INFLUX_BUCKET
    )
    app.state.ws_manager = WSManager(intervals=["1m", "5m", "15m", "1h", "5h"])
    app.state.ws_manager.start()
    yield
    await redis_client.close()
    await influx_writer.close()
    app.state.ws_manager.stop()

app = FastAPI(title="price-service", lifespan=lifespan)

app.include_router(api_router, prefix="/api")
app.include_router(ws_router)

# Health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "OK", "service": "price-service"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8081)