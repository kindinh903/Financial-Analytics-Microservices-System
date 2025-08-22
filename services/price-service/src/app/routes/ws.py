import asyncio
from fastapi import APIRouter, WebSocket, Query
from app.services.broadcast import price_stream, candle_stream, market_snapshot_stream, top_movers_stream
from urllib.parse import parse_qs

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

# WS cho market_snapshot
@router.websocket("/ws/market_snapshot")
async def ws_market_snapshot(websocket: WebSocket, symbols: str):
    symbol_list = [s.strip() for s in symbols.split(",")]
    await market_snapshot_stream.connect(websocket, symbols=symbol_list)
    try:
        while True:
            await asyncio.sleep(1)
    except:
        market_snapshot_stream.disconnect(websocket)




@router.websocket("/ws/top_movers")
async def ws_top_movers(websocket: WebSocket):
    qs = parse_qs(websocket.url.query)
    limit = int(qs.get("limit", ["10"])[0])
    await top_movers_stream.connect(websocket, limit=limit)
    try:
        while True:
            await asyncio.sleep(1)
    except:
        top_movers_stream.disconnect(websocket)
