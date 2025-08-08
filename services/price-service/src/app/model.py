# =========================
# src/app/models.py
# =========================
from pydantic import BaseModel
from typing import Optional

class Candle(BaseModel):
    symbol: str
    interval: str
    open: float
    high: float
    low: float
    close: float
    volume: float
    close_time: int  # epoch ms

class Price(BaseModel):
    symbol: str
    price: float
    timestamp: int  # epoch ms

