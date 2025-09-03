# src/app/config.py
from pathlib import Path
from pydantic_settings import BaseSettings
from typing import ClassVar, Dict, List
import os

class Settings(BaseSettings):
    # service
    SERVICE_PORT: int = int(os.getenv("SERVICE_PORT", 8084))
    MODEL_DIR: str = os.getenv("MODEL_DIR", "./models")

    API_URL: str = os.getenv("FNG_API_URL", "https://api.alternative.me/fng/")  # ✅ thêm type annotation
    CACHE_PATH: Path = Path(os.getenv("FNG_CACHE_PATH", "./data/fng.csv"))
    CACHE_TTL_HOURS: int = int(os.getenv("FNG_CACHE_TTL_HOURS", 6))

    SYMBOL_WHITELIST: ClassVar[List[str]] = [
        'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'ADAUSDT',
        'XRPUSDT', 'DOGEUSDT', 'DOTUSDT', 'LTCUSDT'
    ]
    INTERVALS: ClassVar[List[str]] = [
        "1m", "3m", "5m", "15m", "30m",
        "1h", "2h", "4h", "6h", "8h", "12h",
        "1d", "3d", "1w", "1M"
    ]
    interval_map: ClassVar[Dict[str, str]] = {
        "1m": "1m",
        "3m": "3m",
        "5m": "5m",
        "15m": "15m",
        "30m": "30m",
        "1h": "1h",
        "2h": "2h",
        "4h": "4h",
        "6h": "6h",
        "8h": "8h",
        "12h": "12h",
        "1d": "1d",
        "3d": "3d",
        "1w": "1w",
        "1M": "1mon"
    }


settings = Settings()
