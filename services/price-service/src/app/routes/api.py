
# =========================
# src/app/routes/api.py
# =========================
from fastapi import APIRouter, Query
from typing import Optional
from app.services.price_service import price_service
from app.config import SYMBOL_WHITELIST

router = APIRouter()

#api lấy thông tin của nến
@router.get('/price/candles')
async def get_candles(symbol: str, interval: str = '1m', limit: int = Query(500, le=1000), start_time: Optional[int] = None, end_time: Optional[int] = None):
    res = await price_service.get_candles(symbol, interval, limit=limit, start_time=start_time, end_time=end_time)
    return {"data": res}

#api lấy giá gần nhất của symbol
@router.get('/price/realtime')
async def get_realtime(symbol: str):
    res = await price_service.get_realtime_price(symbol)
    return {"data": res}

#lấy danh sách các symbol hỗ trợ. Bổ sung thêm trong file src/app/config.py
@router.get("/price/symbols")
async def get_symbols():
    res= {"symbols": SYMBOL_WHITELIST}
    return {"data": res}

