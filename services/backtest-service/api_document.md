### Backtest Service API Documentation

## Tổng quan

Backtest service cung cấp API để thực hiện backtesting dựa trên dự đoán AI, tính toán các metrics hiệu suất và lưu trữ kết quả.

---

## REST API

### 1. Chạy Backtest

```
POST /api/backtest
```

**Mô tả:**  
Thực hiện backtesting với dự đoán AI trên dữ liệu lịch sử.

**Request Body:**
```json
{
  "symbol": "BTCUSDT",
  "interval": "1h",
  "startDate": "2024-01-01T00:00:00Z",
  "endDate": "2024-01-31T23:59:59Z",
  "initialBalance": 10000,
  "commission": 0.001,
  "strategy": "AI_PREDICTION",
  "parameters": {
    "confidenceThreshold": 0.6,
    "positionSize": 0.95
  }
}
```

**Response:**
```json
{
  "id": "12345678-1234-1234-1234-123456789012",
  "symbol": "BTCUSDT",
  "interval": "1h",
  "startDate": "2024-01-01T00:00:00Z",
  "endDate": "2024-01-31T23:59:59Z",
  "initialBalance": 10000,
  "finalBalance": 12500,
  "totalReturn": 2500,
  "totalReturnPercent": 25.0,
  "totalTrades": 45,
  "winningTrades": 28,
  "losingTrades": 17,
  "winRate": 0.622,
  "maxDrawdown": 0.08,
  "sharpeRatio": 1.85,
  "accuracy": 0.689,
  "precision": 0.714,
  "recall": 0.667,
  "f1Score": 0.690,
  "createdAt": "2024-01-15T10:30:00Z",
  "trades": [...],
  "performanceHistory": [...]
}
```

---

### 2. Lấy Kết Quả Backtest

```
GET /api/backtest/{id}
```

**Mô tả:**  
Lấy chi tiết kết quả backtest theo ID.

**Response:** BacktestResult object với đầy đủ thông tin trades và performance history.

---

### 3. Lấy Danh Sách Kết Quả

```
GET /api/backtest
```

**Query Parameters:**

| Tham số    | Kiểu     | Mô tả                          | Bắt buộc |
|------------|----------|--------------------------------|----------|
| symbol     | string   | Lọc theo symbol                | Không    |
| interval   | string   | Lọc theo interval              | Không    |
| startDate  | DateTime | Lọc theo ngày bắt đầu          | Không    |
| endDate    | DateTime | Lọc theo ngày kết thúc         | Không    |

**Response:**
```json
[
  {
    "id": "12345678-1234-1234-1234-123456789012",
    "symbol": "BTCUSDT",
    "interval": "1h",
    "startDate": "2024-01-01T00:00:00Z",
    "endDate": "2024-01-31T23:59:59Z",
    "totalReturnPercent": 25.0,
    "winRate": 0.622,
    "accuracy": 0.689,
    "createdAt": "2024-01-15T10:30:00Z"
  }
]
```

---

### 4. Xóa Kết Quả Backtest

```
DELETE /api/backtest/{id}
```

**Mô tả:**  
Xóa kết quả backtest theo ID.

**Response:** 204 No Content

---

### 5. Thống Kê Backtest

```
GET /api/backtest/stats
```

**Query Parameters:**

| Tham số  | Kiểu   | Mô tả           | Bắt buộc |
|----------|--------|-----------------|----------|
| symbol   | string | Lọc theo symbol | Không    |
| interval | string | Lọc theo interval | Không    |

**Response:**
```json
{
  "totalBacktests": 15,
  "averageReturn": 18.5,
  "averageWinRate": 0.612,
  "averageAccuracy": 0.678,
  "averageSharpeRatio": 1.45,
  "averageMaxDrawdown": 0.092,
  "bestPerformingBacktest": {
    "id": "12345678-1234-1234-1234-123456789012",
    "symbol": "BTCUSDT",
    "totalReturnPercent": 35.2
  },
  "worstPerformingBacktest": {
    "id": "87654321-4321-4321-4321-210987654321",
    "symbol": "ETHUSDT",
    "totalReturnPercent": -5.8
  }
}
```

---

## Metrics Giải Thích

### Performance Metrics
- **Total Return**: Tổng lợi nhuận tuyệt đối
- **Total Return %**: Tổng lợi nhuận theo phần trăm
- **Win Rate**: Tỷ lệ giao dịch có lãi
- **Sharpe Ratio**: Risk-adjusted return (càng cao càng tốt)
- **Max Drawdown**: Mức sụt giảm tối đa (càng thấp càng tốt)

### AI Prediction Metrics
- **Accuracy**: Tỷ lệ dự đoán đúng tổng thể
- **Precision**: Tỷ lệ dự đoán đúng trong các giao dịch có lãi
- **Recall**: Tỷ lệ giao dịch có lãi được dự đoán đúng
- **F1-Score**: Harmonic mean của precision và recall

### Trading Metrics
- **Total Trades**: Tổng số giao dịch
- **Winning Trades**: Số giao dịch có lãi
- **Losing Trades**: Số giao dịch thua lỗ

---

## Trading Logic

Service sử dụng logic giao dịch dựa trên AI prediction:

1. **Buy Signal**: Khi AI dự đoán UP với confidence > 60% và không có position
2. **Sell Signal**: Khi AI dự đoán DOWN với confidence > 60% và có position
3. **Position Size**: Sử dụng 95% balance cho mỗi giao dịch
4. **Commission**: Tính phí giao dịch theo tỷ lệ cấu hình
5. **PnL Calculation**: Tính lãi/lỗ dựa trên entry price và exit price

---

## Error Handling

Service trả về các HTTP status codes:
- **200**: Success
- **400**: Bad Request (validation errors)
- **404**: Not Found
- **500**: Internal Server Error

Error response format:
```json
{
  "error": "Internal server error",
  "message": "Detailed error message"
}
```
