#!/usr/bin/env python3
"""
Mock Price Producer - Gửi price updates giả lập lên Kafka
"""

import json
import time
import random
import asyncio
from aiokafka import AIOKafkaProducer
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Danh sách symbols để mock
SYMBOLS = [
    "BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT", "ADAUSDT",
    "XRPUSDT", "DOGEUSDT", "DOTUSDT", "LTCUSDT"
]

# Giá cơ bản cho mỗi symbol
BASE_PRICES = {
    "BTCUSDT": 50000,
    "ETHUSDT": 3000,
    "BNBUSDT": 300,
    "SOLUSDT": 100,
    "ADAUSDT": 0.5,
    "XRPUSDT": 0.6,
    "DOGEUSDT": 0.08,
    "DOTUSDT": 7,
    "LTCUSDT": 70
}

async def mock_price_producer():
    """Mock producer gửi price updates"""
    producer = AIOKafkaProducer(
        bootstrap_servers=['localhost:9092'],
        value_serializer=lambda v: json.dumps(v).encode('utf-8'),
        key_serializer=lambda k: k.encode('utf-8') if k else None
    )
    
    await producer.start()
    
    try:
        logger.info("Mock price producer started. Sending price updates every 5 seconds...")
        
        while True:
            for symbol in SYMBOLS:
                # Tạo giá ngẫu nhiên dựa trên giá cơ bản
                base_price = BASE_PRICES[symbol]
                price_change = random.uniform(-0.02, 0.02)  # ±2% thay đổi
                current_price = base_price * (1 + price_change)
                
                # Tạo volume ngẫu nhiên
                volume = random.uniform(10, 1000)
                
                # Tạo message
                message = {
                    "symbol": symbol,
                    "price": round(current_price, 4),
                    "timestamp": int(time.time() * 1000),
                    "volume": round(volume, 2),
                    "service": "mock-price-service"
                }
                
                # Gửi message
                await producer.send_and_wait(
                    topic="price-updates",
                    key=symbol,
                    value=message
                )
                
                logger.info(f"Sent mock price update: {symbol} = ${message['price']}")
            
            # Đợi 5 giây trước khi gửi batch tiếp theo
            await asyncio.sleep(5)
            
    except KeyboardInterrupt:
        logger.info("Stopping mock producer...")
    except Exception as e:
        logger.error(f"Error in mock producer: {e}")
    finally:
        await producer.stop()

async def main():
    """Main function"""
    logger.info("Starting mock price producer...")
    await mock_price_producer()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Mock producer stopped by user") 