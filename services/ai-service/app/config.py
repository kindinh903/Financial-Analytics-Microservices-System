# src/app/config.py
from pathlib import Path
from pydantic_settings import BaseSettings
from typing import ClassVar, List
import os

class Settings(BaseSettings):

    # service
    SERVICE_PORT: int = int(os.getenv("SERVICE_PORT", 8084))
    MODEL_DIR: str = os.getenv("MODEL_DIR", "./models")
    API_URL = os.getenv("FNG_API_URL", "https://api.alternative.me/fng/")
    CACHE_PATH = Path(os.getenv("FNG_CACHE_PATH", "./data/fng.csv"))
    CACHE_TTL_HOURS = int(os.getenv("FNG_CACHE_TTL_HOURS", 6))

    SYMBOL_WHITELIST: ClassVar[List[str]] = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'ADAUSDT', 'XRPUSDT', 'DOGEUSDT', 'DOTUSDT', 'LTCUSDT']
    INTERVALS: ClassVar[List[str]] = [ 
        "1m", "3m", "5m", "15m", "30m",
        "1h", "2h", "4h", "6h", "8h", "12h",
        "1d", "3d", "1w", "1M"]

settings = Settings()
