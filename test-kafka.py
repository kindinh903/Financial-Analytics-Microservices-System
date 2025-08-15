#!/usr/bin/env python3
"""
Test script để kiểm tra Kafka producer và consumer
"""

import json
import time
from aiokafka import AIOKafkaProducer, AIOKafkaConsumer
import asyncio
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def test_producer():
    """Test Kafka producer"""
    producer = AIOKafkaProducer(
        bootstrap_servers=['localhost:9092'],
        value_serializer=lambda v: json.dumps(v).encode('utf-8'),
        key_serializer=lambda k: k.encode('utf-8') if k else None
    )
    
    await producer.start()
    
    try:
        # Gửi test message
        test_message = {
            "symbol": "TESTUSDT",
            "price": 100.0,
            "timestamp": int(time.time() * 1000),
            "volume": 50.0,
            "service": "test-service"
        }
        
        await producer.send_and_wait(
            topic="price-updates",
            key="TESTUSDT",
            value=test_message
        )
        
        logger.info(f"Sent test message: {test_message}")
        
    finally:
        await producer.stop()

async def test_consumer():
    """Test Kafka consumer"""
    consumer = AIOKafkaConsumer(
        "price-updates",
        bootstrap_servers=['localhost:9092'],
        group_id="test-group",
        auto_offset_reset="latest"
    )
    
    await consumer.start()
    
    try:
        async for msg in consumer:
            logger.info(f"Received message: {msg.value.decode()}")
            break  # Chỉ nhận 1 message để test
    finally:
        await consumer.stop()

async def main():
    """Main test function"""
    logger.info("Testing Kafka producer...")
    await test_producer()
    
    logger.info("Waiting 2 seconds...")
    await asyncio.sleep(2)
    
    logger.info("Testing Kafka consumer...")
    await test_consumer()
    
    logger.info("Test completed!")

if __name__ == "__main__":
    asyncio.run(main()) 