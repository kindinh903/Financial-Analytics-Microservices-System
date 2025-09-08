# =========================
# src/app/routes/api.py
# =========================
from fastapi import APIRouter, Query
from typing import Optional
from app.services.price_service import price_service
from app.storage.influx_client import influx_writer
from app.config import SYMBOL_WHITELIST
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

#api lấy lịch sử của nến theo symbol , interval, limit, start time, end time.
@router.get('/price/candles')
async def get_candles(symbol: str, interval: str = '1m', limit: int = Query(500, le=1000), start_time: Optional[int] = None, end_time: Optional[int] = None):
    try:
        logger.info(f"[API] get_candles called with symbol={symbol}, interval={interval}, limit={limit}, start_time={start_time}, end_time={end_time}")
        
        # Validate symbol
        if symbol not in SYMBOL_WHITELIST:
            logger.warning(f"[API] Invalid symbol: {symbol}")
            return {"error": f"Symbol {symbol} not supported", "data": []}
        
        # Validate interval
        INTERVALS = ["1m", "3m", "5m", "15m", "30m", "1h", "2h", "4h", "6h", "8h", "12h", "1d", "3d", "1w", "1M"]
        if interval not in INTERVALS:
            logger.warning(f"[API] Invalid interval: {interval}")
            return {"error": f"Interval {interval} not supported", "data": []}
        
        res = await price_service.get_candles(symbol, interval, limit=limit, start_time=start_time, end_time=end_time)
        logger.info(f"[API] get_candles returning {len(res) if res else 0} candles")
        return {"data": res}
        
    except Exception as e:
        logger.error(f"[API] Error in get_candles: {str(e)}")
        return {"error": str(e), "data": []}

#api lấy giá gần nhất của symbol
@router.get('/price/realtime')
async def get_realtime(symbol: str):
    try:
        logger.info(f"[API] get_realtime called with symbol={symbol}")
        res = await price_service.get_realtime_price(symbol)
        logger.info(f"[API] get_realtime returning: {res}")
        return {"data": res}
    except Exception as e:
        logger.error(f"[API] Error in get_realtime: {str(e)}")
        return {"error": str(e), "data": None}

#lấy danh sách các symbol hỗ trợ. Bổ sung thêm trong file src/app/config.py
@router.get("/price/symbol")
async def get_symbols():
    try:
        logger.info("[API] get_symbols called")
        res= {"symbols": SYMBOL_WHITELIST}
        return {"data": res}
    except Exception as e:
        logger.error(f"[API] Error in get_symbols: {str(e)}")
        return {"error": str(e), "data": []}

# ========== API MỚI ==========

# 2. Snapshot nhiều cặp coin (so sánh % thay đổi, giá, volume)
@router.get("/price/market_snapshot")
async def get_market_snapshot(symbols: str):
    try:
        logger.info(f"[API] get_market_snapshot called with symbols={symbols}")
        symbol_list = [s.strip() for s in symbols.split(",")]
        res = await price_service.get_market_snapshot(symbol_list)
        logger.info(f"[API] get_market_snapshot returning data for {len(res) if res else 0} symbols")
        return {"data": res}
    except Exception as e:
        logger.error(f"[API] Error in get_market_snapshot: {str(e)}")
        return {"error": str(e), "data": []}

# 3. Top gainers và losers (24h)
@router.get("/price/top_movers")
async def get_top_movers(limit: int = 10):
    try:
        logger.info(f"[API] get_top_movers called with limit={limit}")
        res = await price_service.get_top_movers(limit)
        logger.info(f"[API] get_top_movers returning data")
        return {"data": res}
    except Exception as e:
        logger.error(f"[API] Error in get_top_movers: {str(e)}")
        return {"error": str(e), "data": []}

# 4. Market overview (alias for market_snapshot)
@router.get("/price/market-overview")
async def get_market_overview():
    try:
        logger.info(f"[API] get_market_overview called")
        # Use all available symbols for market overview
        symbol_list = SYMBOL_WHITELIST
        res = await price_service.get_market_snapshot(symbol_list)
        logger.info(f"[API] get_market_overview returning data for {len(res) if res else 0} symbols")
        return {"data": res}
    except Exception as e:
        logger.error(f"[API] Error in get_market_overview: {str(e)}")
        return {"error": str(e), "data": []}

# 5. Historical data (alias for candles endpoint)
@router.get("/price/historical/{symbol}")
async def get_historical_data(symbol: str, timeframe: str = '1h', limit: int = Query(100, le=1000)):
    try:
        logger.info(f"[API] get_historical_data called with symbol={symbol}, timeframe={timeframe}, limit={limit}")
        
        # Map timeframe to interval format
        timeframe_map = {
            '1m': '1m', '3m': '3m', '5m': '5m', '15m': '15m', '30m': '30m',
            '1h': '1h', '2h': '2h', '4h': '4h', '6h': '6h', '8h': '8h', '12h': '12h',
            '1D': '1d', '1d': '1d', '3D': '3d', '3d': '3d', '1W': '1w', '1w': '1w', '1M': '1M'
        }
        
        interval = timeframe_map.get(timeframe, '1h')
        
        # Validate symbol
        if symbol not in SYMBOL_WHITELIST:
            logger.warning(f"[API] Invalid symbol: {symbol}")
            return {"error": f"Symbol {symbol} not supported", "data": []}
        
        # Get candles data
        res = await price_service.get_candles(symbol, interval, limit=limit)
        logger.info(f"[API] get_historical_data returning {len(res) if res else 0} candles")
        return {"data": res}
        
    except Exception as e:
        logger.error(f"[API] Error in get_historical_data: {str(e)}")
        return {"error": str(e), "data": []}