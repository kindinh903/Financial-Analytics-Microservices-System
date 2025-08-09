
# Price Service API Documentation

## Tổng quan

API cung cấp dữ liệu giá và thông tin nến (candles) cho các symbol tiền điện tử được hỗ trợ.

---

## REST API

### 1. Lấy thông tin nến (candles)

```
GET /api/price/candles
```

**Mô tả:**  
Trả về dữ liệu nến cho một symbol theo khoảng thời gian và số lượng giới hạn.

**Query Parameters:**

| Tham số    | Kiểu     | Mặc định | Mô tả                                                   | Bắt buộc |
|------------|----------|----------|---------------------------------------------------------|----------|
| symbol     | string   | —        | Symbol cần lấy dữ liệu, phải nằm trong danh sách hỗ trợ | Có       |
| interval   | string   | "1m"     | Khoảng thời gian nến, ví dụ: 1m, 5m, 15m, 1h, 6h        | Không    |
| limit      | integer  | 500      | Số lượng nến tối đa trả về, tối đa 1000                 | Không    |
| start_time | int (ms) | —        | Thời điểm bắt đầu (timestamp tính bằng milliseconds)    | Không    |
| end_time   | int (ms) | —        | Thời điểm kết thúc (timestamp tính bằng milliseconds)   | Không    |

INTERVALS =["1m", "5m", "15m", "1h", "6h", "12h", "1d", "3d", "1w", "1M" ]
**Response:**

```json
{
  "data": [
    {
      "open_time": 1234567890,
      "open": "...",
      "high": "...",
      "low": "...",
      "close": "...",
      "volume": "...",
      "close_time": 1234567999
    }
  ]
}
```

---

### 2. Lấy giá realtime của symbol

```
GET /api/price/realtime
```

**Mô tả:**  
Trả về giá gần nhất của symbol.

**Query Parameters:**

| Tham số | Kiểu   | Mô tả                          | Bắt buộc |
|---------|--------|-------------------------------|----------|
| symbol  | string | Symbol cần lấy giá realtime    | Có       |

**Response:**

```json
{
  "data": {
    "price": "..."
  }
}
```

---

### 3. Lấy danh sách symbol được hỗ trợ

```
GET /api/price/symbols
```

**Mô tả:**  
Trả về danh sách các symbol đang được hỗ trợ.

**Response:**

```json
{
  "data": {
    "symbols": [
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
  }
}
```

---

## WebSocket API

### 1. Kết nối giá realtime cho symbol

```
ws://<host>/ws/price?symbol=<symbol>
```

- Mở kết nối WebSocket để nhận dữ liệu giá realtime.
- Giữ kết nối mở, server sẽ gửi dữ liệu theo thời gian thực.

---

### 2. Kết nối nhận dữ liệu nến realtime cho symbol theo interval

```
ws://<host>/ws/candle?symbol=<symbol>&interval=<interval>
```

- Mở kết nối WebSocket để nhận dữ liệu nến realtime theo khoảng thời gian.
- `interval` có thể là: INTERVALS =["1m", "5m", "15m", "1h", "6h", "12h", "1d", "3d", "1w", "1M" ]

---

## Danh sách symbol hỗ trợ

- BTCUSDT
- ETHUSDT
- BNBUSDT
- SOLUSDT
- ADAUSDT
- XRPUSDT
- DOGEUSDT
- DOTUSDT
- LTCUSDT
