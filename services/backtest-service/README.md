# Backtest Service

Backtest service được viết bằng Go, nhận price updates từ Kafka và thực hiện backtesting đơn giản.

## Tính năng

- Kafka consumer để nhận price updates từ price-service
- HTTP API để kiểm tra health và xem statistics
- Logging chi tiết các price updates nhận được
- Graceful shutdown

## Cấu hình

Service sử dụng các cấu hình mặc định:
- Kafka brokers: `kafka:9092`
- Kafka topic: `price-updates`
- HTTP port: `8082`

## API Endpoints

### Health Check
```
GET /health
```
Trả về trạng thái của service.

### Statistics
```
GET /stats
```
Trả về số lượng price updates đã nhận được cho mỗi symbol.

## Build và Run

### Local Development
```bash
go mod tidy
go run main.go
```

### Docker
```bash
docker build -t backtest-service .
docker run -p 8082:8082 backtest-service
```

## Kafka Message Format

Service nhận các message có format JSON như sau:
```json
{
  "symbol": "BTCUSDT",
  "price": 50000.0,
  "timestamp": 1640995200000,
  "volume": 100.5,
  "service": "price-service"
}
```

## Logging

Service sử dụng logrus để logging với các thông tin:
- Symbol
- Price
- Timestamp
- Volume
- Service source

## Mở rộng

Để thêm logic backtesting, bạn có thể:
1. Thêm các strategy vào `handlePriceUpdate` method
2. Tạo các struct để lưu trữ historical data
3. Implement các indicator và signal
4. Thêm endpoints để query backtest results 