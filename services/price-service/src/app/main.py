from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import asyncio
import logging
from contextlib import asynccontextmanager

from app.services.price_service import PriceService
from app.services.ws_manager import WebSocketManager
from app.storage.redis_client import redis_client
from app.storage.influx_client import influx_writer

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global variables for services
price_service = None
ws_manager = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    global price_service, ws_manager
    
    logger.info("Starting Price Service...")
    
    # Initialize services
    price_service = PriceService(redis_client, influx_writer)
    ws_manager = WebSocketManager(price_service)
    
    # Start Binance streams in background
    asyncio.create_task(price_service.start_binance_streams())
    
    logger.info("Price Service started successfully")
    
    yield
    
    # Shutdown
    logger.info("Shutting down Price Service...")

app = FastAPI(
    title="Financial Analytics Price Service",
    description="Real-time cryptocurrency price data service with WebSocket support",
    version="1.0.0",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "price-service"}

@app.get("/api/symbols")
async def get_symbols():
    """Get list of supported trading pairs"""
    if price_service:
        symbols = await price_service.get_supported_pairs()
        return {"symbols": symbols}
    return {"symbols": []}

@app.get("/api/price/{symbol}")
async def get_current_price(symbol: str):
    """Get current price for a trading pair"""
    if price_service:
        price_data = await price_service.get_current_price(symbol)
        if price_data:
            return price_data
        else:
            return JSONResponse(
                status_code=404,
                content={"error": f"No price data available for {symbol}"}
            )
    return JSONResponse(
        status_code=503,
        content={"error": "Service not ready"}
    )

@app.get("/api/historical/{symbol}")
async def get_historical_data(
    symbol: str,
    interval: str = "1m",
    limit: int = 1000
):
    """Get historical price data for a trading pair"""
    if price_service:
        try:
            historical_data = await price_service.get_historical_data(symbol, interval, limit)
            return {
                "symbol": symbol,
                "interval": interval,
                "data": historical_data,
                "count": len(historical_data)
            }
        except Exception as e:
            logger.error(f"Error getting historical data for {symbol}: {e}")
            return JSONResponse(
                status_code=500,
                content={"error": "Failed to get historical data"}
            )
    return JSONResponse(
        status_code=503,
        content={"error": "Service not ready"}
    )

@app.get("/api/stats")
async def get_service_stats():
    """Get service statistics"""
    if ws_manager:
        stats = await ws_manager.get_client_stats()
        return {
            "service": "price-service",
            "stats": stats
        }
    return {"service": "price-service", "stats": {}}

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time price data"""
    if not ws_manager:
        await websocket.close(code=1011, reason="Service not ready")
        return
    
    await websocket.accept()
    
    try:
        # Handle WebSocket connection
        await ws_manager.handle_websocket_connection(websocket, "/ws")
    except WebSocketDisconnect:
        logger.info("WebSocket client disconnected")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        try:
            await websocket.close(code=1011, reason="Internal error")
        except:
            pass

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8081)