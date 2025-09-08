import json
import logging
from typing import Dict, Any
from aiokafka import AIOKafkaProducer
from app.config import settings

logger = logging.getLogger(__name__)

class KafkaPriceProducer:
    def __init__(self):
        self.producer: AIOKafkaProducer = None
        
    async def start(self):
        """Khởi tạo Kafka producer"""
        try:
            self.producer = AIOKafkaProducer(
                bootstrap_servers=settings.KAFKA_BOOTSTRAP_SERVERS,
                value_serializer=lambda v: json.dumps(v).encode('utf-8'),
                key_serializer=lambda k: k.encode('utf-8') if k else None
            )
            await self.producer.start()
            logger.info("Kafka producer started successfully")
        except Exception as e:
            logger.error(f"Failed to start Kafka producer: {e}")
            raise
            
    async def stop(self):
        """Dừng Kafka producer"""
        if self.producer:
            await self.producer.stop()
            logger.info("Kafka producer stopped")
            
    async def send_price_update(self, symbol: str, price_data: Dict[str, Any]):
        """Gửi price update đến Kafka topic"""
        if not self.producer:
            logger.error("Kafka producer not initialized")
            return
            
        try:
            message = {
                "symbol": symbol,
                "timestamp": price_data.get("timestamp"),
                "price": price_data.get("price"),
                "volume": price_data.get("volume"),
                "service": "price-service"
            }
            
            # Use send() instead of send_and_wait() to avoid blocking
            # The producer will handle retries automatically
            future = await self.producer.send(
                topic=settings.KAFKA_PRICE_TOPIC,
                key=symbol,
                value=message
            )
            logger.debug(f"Sent price update for {symbol}: {message}")
        except Exception as e:
            logger.error(f"Failed to send price update for {symbol}: {e}")

# Global instance
kafka_producer = KafkaPriceProducer() 