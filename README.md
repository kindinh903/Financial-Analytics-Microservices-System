# Financial Analytics Platform - Kafka Integration

Project này implement Kafka cho price service và tạo backtest service đơn giản bằng Go.

## Cấu trúc Project

```
├── services/
│   ├── price-service/          # Python FastAPI service với Kafka producer
│   └── backtest-service/       # Go service với Kafka consumer
├── docker-compose.yml          # Docker compose để chạy toàn bộ hệ thống
├── test-kafka.py              # Script test Kafka
└── README.md                  # File này
```

## Services

### Price Service (Python)
- **Port**: 8081
- **Chức năng**: 
  - Nhận real-time price data từ Binance WebSocket
  - Lưu trữ vào Redis và InfluxDB
  - Gửi price updates đến Kafka topic `price-updates`
- **Kafka**: Producer gửi price updates

### Backtest Service (Go)
- **Port**: 8082
- **Chức năng**:
  - Nhận price updates từ Kafka
  - Log và thống kê các message nhận được
  - HTTP API để xem statistics
- **Kafka**: Consumer nhận price updates

## Cách chạy

### 1. Khởi động toàn bộ hệ thống
```bash
docker-compose up -d
```

### 2. Kiểm tra services
```bash
# Kiểm tra price service
curl http://localhost:8081/health

# Kiểm tra backtest service
curl http://localhost:8082/health

# Xem statistics của backtest service
curl http://localhost:8082/stats
```

### 3. Test Kafka (tùy chọn)
```bash
# Cài đặt dependencies
pip install aiokafka

# Chạy test script
python test-kafka.py
```

## Kafka Configuration

### Topic
- **Name**: `price-updates`
- **Partitions**: 1 (mặc định)
- **Replication**: 1 (development)

### Message Format
```json
{
  "symbol": "BTCUSDT",
  "price": 50000.0,
  "timestamp": 1640995200000,
  "volume": 100.5,
  "service": "price-service"
}
```

## API Endpoints

### Price Service
- `GET /health` - Health check
- `GET /api/prices/{symbol}` - Get current price
- `GET /api/candles/{symbol}/{interval}` - Get historical candles
- `WS /ws/prices` - WebSocket for real-time prices

### Backtest Service
- `GET /health` - Health check
- `GET /stats` - Get message statistics

## Monitoring

### Logs
```bash
# Xem logs price service
docker-compose logs -f price-service

# Xem logs backtest service
docker-compose logs -f backtest-service

# Xem logs Kafka
docker-compose logs -f kafka
```

### Kafka Topics
```bash
# Vào Kafka container
docker exec -it kafka bash

# List topics
kafka-topics --bootstrap-server localhost:9092 --list

# Describe topic
kafka-topics --bootstrap-server localhost:9092 --describe --topic price-updates
```

## Development

### Price Service
```bash
cd services/price-service
pip install -r requirements.txt
python src/app/main.py
```

### Backtest Service
```bash
cd services/backtest-service
go mod tidy
go run main.go
```

## Troubleshooting

### Kafka không kết nối được
1. Kiểm tra Kafka đã start chưa: `docker-compose ps`
2. Kiểm tra logs: `docker-compose logs kafka`
3. Đảm bảo Zookeeper đã start trước Kafka

### Services không nhận được messages
1. Kiểm tra topic đã tạo chưa
2. Kiểm tra consumer group
3. Xem logs của từng service

### Port conflicts
- Đảm bảo ports 8081, 8082, 9092, 6379, 8086 không bị sử dụng
- Hoặc thay đổi ports trong docker-compose.yml

## Mở rộng

### Thêm Backtest Logic
1. Tạo struct cho historical data trong `main.go`
2. Implement indicators (MA, RSI, etc.)
3. Thêm trading strategies
4. Tạo endpoints để query backtest results

### Thêm Services
1. Tạo service mới trong `services/`
2. Thêm vào `docker-compose.yml`
3. Implement Kafka consumer/producer tương ứng

### Monitoring
1. Thêm Prometheus metrics
2. Tạo Grafana dashboards
3. Implement alerting