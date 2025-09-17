from contextlib import asynccontextmanager
from fastapi import FastAPI
from app.config import settings, SYMBOL_WHITELIST, INTERVALS
import os
from app.storage.redis_client import redis_client
from app.storage.influx_client import influx_writer
from app.routes.api import router as api_router
from app.routes.ws import router as ws_router
from app.services.ws_manager import WSManager
from app.services.kafka_producer import kafka_producer
import logging
import uvicorn
import asyncio
import grpc
from app.grpc_server import PriceServiceGrpc
from app.grpc import price_pb2_grpc

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
    
    # Only start Kafka producer if KAFKA_ENABLED is not set to false
    kafka_enabled = os.getenv('KAFKA_ENABLED', 'true').lower() != 'false'
    if kafka_enabled:
        await kafka_producer.start()
    else:
        logging.info("Kafka producer disabled by KAFKA_ENABLED=false")
    
    app.state.ws_manager = WSManager(intervals=INTERVALS)
    app.state.ws_manager.start_all()
Đ    
    # Start gRPC server
    grpc_server = grpc.aio.server()
    price_pb2_grpc.add_PriceServiceServicer_to_server(PriceServiceGrpc(), grpc_server)
    grpc_server.add_insecure_port("0.0.0.0:9090")
    await grpc_server.start()
    logging.info("gRPC server started on port 9090")
    app.state.grpc_server = grpc_server
    
    yield
    
    # Shutdown
    await grpc_server.stop(grace=5.0)
    await redis_client.close()
    await influx_writer.close()
    
    if kafka_enabled:
        await kafka_producer.stop()
    
    app.state.ws_manager.stop_all()

app = FastAPI(title="price-service", lifespan=lifespan)

app.include_router(api_router, prefix="/api")
app.include_router(ws_router)

# Health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "OK", "service": "price-service"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8081)