# src/app/config.py
from pydantic_settings import BaseSettings
from typing import ClassVar, List
import os

class Settings(BaseSettings):

    # service
    SERVICE_PORT: int = int(os.getenv("SERVICE_PORT", 8084))
    MODEL_DIR: str = os.getenv("MODEL_DIR", "./models")
    
    SEQ_LEN: int = int(os.getenv("SEQ_LEN", 128))

    # kafka
    # KAFKA_BOOTSTRAP: str = os.getenv("KAFKA_BOOTSTRAP", "kafka:9092")
    # PRICE_TOPIC: str = os.getenv("PRICE_TOPIC", "price-stream")
    # SENT_TOPIC: str = os.getenv("SENT_TOPIC", "sentiment-stream")
    # PRED_TOPIC: str = os.getenv("PRED_TOPIC", "prediction-stream")
    # KAFKA_GROUP: str = os.getenv("KAFKA_GROUP", "ai-service-v1")

    # redis
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://redis:6379/0")

    # influx
    INFLUX_URL: str = os.getenv("INFLUX_URL", "http://influxdb:8086")
    INFLUX_TOKEN: str = os.getenv("INFLUX_TOKEN", "my-secret-token")
    INFLUX_ORG: str = os.getenv("INFLUX_ORG", "Financial-Analytics")
    INFLUX_BUCKET: str = os.getenv("INFLUX_BUCKET", "predictions")




    SYMBOL_WHITELIST: ClassVar[List[str]] = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'ADAUSDT', 'XRPUSDT', 'DOGEUSDT', 'DOTUSDT', 'LTCUSDT']
    INTERVALS: ClassVar[List[str]] = [ 
        "1m", "3m", "5m", "15m", "30m",
        "1h", "2h", "4h", "6h", "8h", "12h",
        "1d", "3d", "1w", "1M"]

settings = Settings()
