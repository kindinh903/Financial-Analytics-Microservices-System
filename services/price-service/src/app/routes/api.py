
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
@router.get("/price/symbol")
async def get_symbols():
    res= {"symbols": SYMBOL_WHITELIST}
    return {"data": res}


# ========== API MỚI ==========

# 1. Lấy dữ liệu lịch sử (1D, 1W, 1M) để vẽ chart lớn
@router.get("/price/history")
async def get_history(symbol: str, interval: str = "1d", limit: int = Query(500, le=1000), start_time: Optional[int] = None, end_time: Optional[int] = None):
    res = await price_service.get_history(symbol, interval, limit=limit, start_time=start_time, end_time=end_time)
    return {"data": res}

# 2. Snapshot nhiều cặp coin (so sánh % thay đổi, giá, volume)
@router.get("/price/market_snapshot")
async def get_market_snapshot(symbols: str):
    symbol_list = [s.strip() for s in symbols.split(",")]
    res = await price_service.get_market_snapshot(symbol_list)
    return {"data": res}

# 3. Top gainers và losers (24h)
@router.get("/price/top_movers")
async def get_top_movers(limit: int = 10):
    res = await price_service.get_top_movers(limit)
    return {"data": res}