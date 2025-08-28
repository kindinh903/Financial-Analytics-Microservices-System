from pydantic import BaseModel
from typing import List, Optional

class Candle(BaseModel):
    open_time: int
    close_time: int
    open: float
    high: float
    low: float
    close: float
    volume: float

class Sentiment(BaseModel):
    fng: Optional[float] = None
    score: Optional[float] = None

class PredictRequest(BaseModel):
    symbol: str
    interval: str
    candles: List[Candle]
    sentiment: Optional[Sentiment] = None

class PredictResponse(BaseModel):
    symbol: str
    interval: str
    latest_close_time: int
    latest_close: float
    predicted_close: float
    predicted_return: float
    direction: str
    confidence: float
    model_name: str
    model_version: str
