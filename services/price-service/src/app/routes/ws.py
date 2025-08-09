import asyncio
from fastapi import APIRouter, WebSocket
from app.services.broadcast import price_stream, candle_stream

router = APIRouter()

@router.websocket("/ws/price")
async def ws_price(websocket: WebSocket, symbol: str):
    await price_stream.connect(websocket, symbol=symbol)
    try:
        while True:
            await asyncio.sleep(1)  # Giữ kết nối mở
    except:
        price_stream.disconnect(websocket)

@router.websocket("/ws/candle")
async def ws_candle(websocket: WebSocket, symbol: str, interval: str):
    await candle_stream.connect(websocket, symbol=symbol, interval=interval)
    try:
        while True:
            await asyncio.sleep(1)
    except:
        candle_stream.disconnect(websocket)
