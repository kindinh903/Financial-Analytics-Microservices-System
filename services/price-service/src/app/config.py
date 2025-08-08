
# =========================
# src/app/config.py
# =========================
from pydantic import BaseSettings

class Settings(BaseSettings):
    REDIS_URL: str = "redis://localhost:6379/0"
    INFLUX_URL: str = "http://localhost:9090"
    INFLUX_TOKEN: str = "my-secret-token"
    INFLUX_ORG: str = "Financial-Analytics"
    INFLUX_BUCKET: str = "PriceServiceDB"
    BINANCE_REST_BASE: str = "https://api.binance.com/api/v3"
    BINANCE_WS_BASE: str = "wss://stream.binance.com:9443/ws"
    CANDLES_LIST_MAX: int = 1000

    class Config:
        env_file = ".env"

settings = Settings()
