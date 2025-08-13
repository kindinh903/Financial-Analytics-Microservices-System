# src/app/config.py
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    REDIS_URL: str = "redis://redis:6379/0"
    INFLUX_URL: str = "http://influxdb:8086"
    INFLUX_TOKEN: str = "my-secret-token"
    INFLUX_ORG: str = "Financial-Analytics"
    INFLUX_BUCKET: str = "PriceServiceDB"
    BINANCE_REST_BASE: str = "https://api.binance.com/api/v3"
    BINANCE_WS_BASE: str = "wss://stream.binance.com:9443"
    CANDLES_LIST_MAX: int = 1000



settings = Settings()


SYMBOL_WHITELIST = [
    "BTCUSDT",
    "ETHUSDT",
    "BNBUSDT",
    "SOLUSDT",
    "ADAUSDT",
    "XRPUSDT",
    "DOGEUSDT",
    "DOTUSDT",
    "LTCUSDT"
]

INTERVALS =["1m", "5m", "15m", "1h", "6h", "12h", "1d", "3d", "1w", "1M" ]