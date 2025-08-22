import asyncio
import websockets
import json

SYMBOL = "BTCUSDT"
INTERVAL = "1m"

# ==========================
# Các hàm test WS
# ==========================

async def listen_price():
    url = f"ws://127.0.0.1:8081/ws/price?symbol={SYMBOL}"
    async with websockets.connect(url) as ws:
        async for msg in ws:
            print("Price:", json.loads(msg))

async def listen_candle():
    url = f"ws://127.0.0.1:8081/ws/candle?symbol={SYMBOL}&interval={INTERVAL}"
    async with websockets.connect(url) as ws:
        async for msg in ws:
            print("Candle:", json.loads(msg))

async def listen_market_snapshot():
    url = f"ws://127.0.0.1:8081/ws/market_snapshot?symbols=BTCUSDT,ETHUSDT"

    async with websockets.connect(url) as ws:
        async for msg in ws:
            print("Market Snapshot:", json.loads(msg))

async def listen_top_movers():
    url = f"ws://127.0.0.1:8081/ws/top_movers?limit=5" 

    async with websockets.connect(url) as ws:
        async for msg in ws:
            print("Top Movers:", json.loads(msg))

# ==========================
# Main
# ========================== 

async def main():
    await asyncio.gather(
        # listen_price(),
        # listen_candle(),
        # listen_market_snapshot(),
        listen_top_movers()
    )

if __name__ == "__main__":
    asyncio.run(main())
