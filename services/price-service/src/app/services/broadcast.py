import asyncio
from typing import Optional
from fastapi import WebSocket

class BroadcastManager:
    def __init__(self):
        # Mỗi kết nối lưu thêm filter symbol & interval
        self.active_connections: list[dict] = []

    async def connect(self, websocket: WebSocket, symbol: Optional[str] = None, interval: Optional[str] = None):
        await websocket.accept()
        self.active_connections.append({
            "ws": websocket,
            "symbol": symbol.upper() if symbol else None,
            "interval": interval
        })

    def disconnect(self, websocket: WebSocket):
        self.active_connections = [
            conn for conn in self.active_connections if conn["ws"] != websocket
        ]

    async def broadcast(self, message: dict):
        """
        message có thể là:
        - giá: {"symbol": "BTCUSDT", "price": ..., "timestamp": ...}
        - nến: {"symbol": "BTCUSDT", "interval": "1m", ...}
        """
        to_remove = []
        for conn in self.active_connections:
            ws = conn["ws"]
            try:
                # Lọc theo symbol
                if conn["symbol"] and message.get("symbol") != conn["symbol"]:
                    continue
                # Lọc theo interval nếu có
                if conn["interval"] and message.get("interval") != conn["interval"]:
                    continue

                await ws.send_json(message)
            except:
                to_remove.append(ws)

        # Xóa kết nối bị lỗi
        for ws in to_remove:
            self.disconnect(ws)

# Tạo 2 instance riêng cho price và candle
price_stream = BroadcastManager()
candle_stream = BroadcastManager()
