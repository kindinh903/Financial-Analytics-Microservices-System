import asyncio
from typing import Optional
from fastapi import WebSocket

class BroadcastManager:
    def __init__(self):
        self.active_connections: list[dict] = []

    async def connect(self, websocket: WebSocket, **kwargs):
        await websocket.accept()
        # Lưu tất cả thông tin kết nối, ví dụ symbol, interval, limit, symbols
        self.active_connections.append({"ws": websocket, **kwargs})

    def disconnect(self, websocket: WebSocket):
        self.active_connections = [
            conn for conn in self.active_connections if conn["ws"] != websocket
        ]

    async def broadcast(self, message: dict):
        to_remove = []
        for conn in self.active_connections:
            ws = conn["ws"]
            limit = conn.get("limit")  # Lấy limit từ connection (nếu có)
            try:
                # Lọc theo symbol nếu có
                if conn.get("symbol") and message.get("symbol") != conn.get("symbol"):
                    continue
                # Lọc theo interval nếu có
                if conn.get("interval") and message.get("interval") != conn.get("interval"):
                    continue

                # Nếu message là top movers, áp dụng limit
                if "top_gainers" in message and "top_losers" in message and limit:
                    filtered_msg = {
                        "top_gainers": message["top_gainers"][:limit],
                        "top_losers": message["top_losers"][:limit]
                    }
                    await ws.send_json(filtered_msg)
                else:
                    await ws.send_json(message)
            except:
                to_remove.append(ws)
        for ws in to_remove:
            self.disconnect(ws)

# Tạo 2 instance riêng cho price và candle
price_stream = BroadcastManager()
candle_stream = BroadcastManager()
market_snapshot_stream = BroadcastManager()
top_movers_stream = BroadcastManager()



