import asyncio
import websockets
import json

SYMBOL = "BTCUSDT"
INTERVAL = "1m"

#test thử kết nối ws 
async def listen_price():
    url = f"ws://localhost:8081/ws/price?symbol=BTCUSDT"
    async with websockets.connect(url) as ws:
        async for msg in ws:
            print("Price:", json.loads(msg))

async def listen_candle():
    url = f"ws://localhost:8081/ws/candle?symbol={SYMBOL}&interval={INTERVAL}"
    async with websockets.connect(url) as ws:
        async for msg in ws:
            print("Candle:", json.loads(msg))

async def main():
    await asyncio.gather(
        listen_price(),
        listen_candle()
    )

if __name__ == "__main__":
    asyncio.run(main())
