# WebSocket Integration for Trading Charts

## Overview

Hệ thống đã được cấu hình để sử dụng WebSocket để nhận dữ liệu thời gian thực thay vì polling API liên tục. Điều này giúp:

- ⚡ **Performance**: Giảm tải server và tăng tốc độ cập nhật
- 🔄 **Real-time**: Cập nhật dữ liệu ngay lập tức khi có thay đổi
- 📊 **Efficiency**: Chỉ truyền dữ liệu khi cần thiết

## Architecture

```
Frontend (React) → WebSocket Service → Price Service (FastAPI) → Binance API
```

## Files Added/Modified

### 1. WebSocket Service (`src/services/websocket.js`)
- Quản lý kết nối WebSocket
- Auto-reconnection logic
- Support cho multiple connections
- Error handling và connection status

### 2. WebSocket Hook (`src/hooks/useWebSocket.js`)
- React hook để quản lý WebSocket connections
- Cleanup tự động khi component unmount
- State management cho connection status

### 3. Updated TradingChart (`src/components/Charts/TradingChart.js`)
- Sử dụng WebSocket thay vì polling API
- Load dữ liệu lịch sử ban đầu từ API
- Nhận updates thời gian thực từ WebSocket
- Hiển thị trạng thái kết nối

### 4. Updated ChartHeader (`src/components/Charts/ChartHeader.js`)
- Thêm indicator trạng thái kết nối WebSocket
- Live/Offline status với icon

### 5. Environment Configuration (`.env`)
- `REACT_APP_WS_URL`: WebSocket base URL
- `REACT_APP_API_URL`: API base URL

## WebSocket Endpoints

### Price Service WebSocket Endpoints:

1. **Price Stream**: `/ws/price?symbol={symbol}`
   - Real-time price updates
   - Example: `ws://localhost:8001/ws/price?symbol=BTCUSDT`

2. **Candle Stream**: `/ws/candle?symbol={symbol}&interval={interval}`
   - Real-time candlestick updates
   - Example: `ws://localhost:8001/ws/candle?symbol=BTCUSDT&interval=5m`

3. **Market Snapshot**: `/ws/market_snapshot?symbols={symbol1,symbol2}`
   - Multiple symbols market data
   - Example: `ws://localhost:8001/ws/market_snapshot?symbols=BTCUSDT,ETHUSDT`

4. **Top Movers**: `/ws/top_movers?limit={limit}`
   - Top performing symbols
   - Example: `ws://localhost:8001/ws/top_movers?limit=10`

## Data Flow

### Initial Load:
1. Component mounts
2. Fetch historical data from API (500 candles)
3. Initialize chart with historical data
4. Connect to WebSocket for real-time updates

### Real-time Updates:
1. WebSocket receives new candle data
2. Update chart with new/updated candle
3. Update volume series
4. Update current price display

## WebSocket Message Format

### Candle Update Message:
```json
{
  "candle": {
    "symbol": "BTCUSDT",
    "interval": "5m",
    "open": "111245.12",
    "high": "111274.45",
    "low": "111200",
    "close": "111200",
    "volume": "9.8797",
    "close_time": 1757263799999
  }
}
```

### Price Update Message:
```json
{
  "symbol": "BTCUSDT",
  "price": "111200.00",
  "timestamp": 1757263799999
}
```

## Configuration

### Environment Variables:
```env
# API and WebSocket URLs
REACT_APP_API_URL=http://localhost:8080
REACT_APP_WS_URL=ws://localhost:8001
```

### WebSocket Connection Options:
- **Auto-reconnection**: Enabled with exponential backoff
- **Max reconnect attempts**: 5
- **Reconnect delay**: 3 seconds (with exponential backoff)

## Usage Example

```jsx
import { useWebSocketChart } from '../hooks/useWebSocket';

const MyChart = ({ symbol, interval }) => {
  const { isConnected } = useWebSocketChart({
    symbol,
    interval,
    onCandleUpdate: (data) => console.log('New candle:', data),
    onPriceUpdate: (data) => console.log('Price update:', data),
    onError: (error) => console.error('WebSocket error:', error),
    enabled: true
  });

  return (
    <div>
      Status: {isConnected ? 'Connected' : 'Disconnected'}
    </div>
  );
};
```

## Benefits

1. **Reduced API Calls**: Không cần polling liên tục
2. **Lower Latency**: Cập nhật ngay lập tức khi có dữ liệu mới
3. **Better UX**: Real-time price updates, connection status indicator
4. **Scalability**: Server có thể handle nhiều clients hiệu quả hơn
5. **Bandwidth Efficiency**: Chỉ truyền dữ liệu khi có thay đổi

## Troubleshooting

### Common Issues:

1. **Connection Failed**:
   - Kiểm tra Price Service có đang chạy
   - Kiểm tra URL trong `.env`
   - Kiểm tra firewall/proxy settings

2. **No Data Updates**:
   - Kiểm tra WebSocket connection status
   - Xem console logs để debug
   - Kiểm tra symbol và interval có hợp lệ

3. **Frequent Disconnections**:
   - Kiểm tra network stability
   - Điều chỉnh reconnection settings
   - Kiểm tra server-side connection limits

### Debug Commands:
```javascript
// Check connection status
websocketService.getConnectionStatus('candle_BTCUSDT_5m')

// Manual disconnect
websocketService.disconnect('candle_BTCUSDT_5m')

// Disconnect all
websocketService.disconnectAll()
```

## Future Enhancements

1. **Connection Pooling**: Optimize multiple connections
2. **Message Queuing**: Handle high-frequency updates
3. **Compression**: Reduce bandwidth usage
4. **Authentication**: Secure WebSocket connections
5. **Rate Limiting**: Client-side rate limiting for updates
