# Financial Analytics Microservices System

## Kiến trúc hệ thống

- **Frontend**: React (port 3000)
- **API Gateway**: Spring Boot (port 8080) - 
- **Auth Service**: Node.js + MongoDB (port 8087) - JWT Authentication
- **Notification Service**: Go (port 8086)
- **Price Service**: Python FastAPI (port 8081) - **✅ Đã tích hợp Kafka Producer**
- **News Service**: Python Flask (port 8083)
- **Backtest Service**: Go (port 8082) - **✅ Đã tích hợp Kafka Consumer**
- **AI Service**: Python FastAPI (port 8084)
- **User Service**: Spring Boot (port 8085)
- **Kafka**: (port 9092), **Zookeeper**: (port 2181)
- **Redis**: (port 6379)
- **MongoDB**: (port 27017)
- **InfluxDB**: (port 9090)

## Kafka Integration

### Price Service → Backtest Service
- **Price Service** nhận real-time price data từ Binance WebSocket và gửi đến Kafka topic `price-updates`
- **Backtest Service** nhận price updates từ Kafka và thực hiện backtesting
- **Message Format**:
```json
{
  "symbol": "BTCUSDT",
  "price": 50000.0,
  "timestamp": 1640995200000,
  "volume": 100.5,
  "service": "price-service"
}
```

### Kafka Configuration
- **Topic**: `price-updates`
- **Producer**: Price Service (Python + aiokafka)
- **Consumer**: Backtest Service (Go + sarama)
- **Bootstrap Servers**: `kafka:29092` (internal), `localhost:9092` (external)

## Chạy toàn bộ hệ thống

```bash
docker-compose up --build
```

- Truy cập frontend: http://localhost:3000
- **API Gateway (duy nhất)**: http://localhost:8080
- **Các services KHÔNG expose ports ra ngoài** - chỉ có thể truy cập qua Gateway
- Healthcheck tại `/health` qua Gateway

## API Endpoints qua Gateway

Tất cả APIs phải được gọi qua Gateway:

```bash
# ❌ KHÔNG gọi trực tiếp services
# curl http://localhost:8087/api/auth/login

# ✅ Gọi qua Gateway
curl http://localhost:8080/api/auth/login
curl http://localhost:8080/api/price/candles?symbol=BTCUSDT
curl http://localhost:8080/api/users/profile
```

## Kafka Testing

### Test Kafka Producer/Consumer
```bash
# Cài đặt dependencies
pip install aiokafka

# Chạy test script
python test-kafka.py
```

### Monitor Kafka Topics
```bash
# Vào Kafka container
docker exec -it kafka bash

# List topics
kafka-topics --bootstrap-server localhost:9092 --list

# Describe topic
kafka-topics --bootstrap-server localhost:9092 --describe --topic price-updates
```

## Phát triển từng service

### Auth Service (Node.js)
```bash
cd services/auth-service
npm install
cp env.example .env
# Edit .env file with your configuration
npm run dev
```

### Notification Service (Go)
```bash
cd services/notification-service
go mod tidy
go run main.go
```

### Price Service (Python FastAPI) - **Kafka Producer**
```bash
cd services/price-service
pip install -r requirements.txt
python src/app/main.py
```

### News Service (Python Flask)
```bash
cd services/news-service
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python app.py
```

### Backtest Service (Go) - **Kafka Consumer**
```bash
cd services/backtest-service
go mod tidy
go run main.go
```

### AI Service (Python FastAPI)
```bash
cd services/ai-service
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python app.py
```

### User Service (Java Spring Boot)
```bash
cd services/user-service
./mvnw spring-boot:run
# hoặc build jar:
mvn clean package
java -jar target/*.jar
```

### Gateway (Java Spring Boot)
```bash
cd gateway
./mvnw spring-boot:run
# hoặc build jar:
mvn clean package
java -jar target/*.jar
```

### Frontend (React)
```bash
cd frontend
npm install
npm start
```

## Kết nối Kafka/Redis/MongoDB
- Kafka broker: `kafka:29092` (internal), `localhost:9092` (external)
- Redis: `redis:6379`
- MongoDB: `mongodb:27017`
- InfluxDB: `influxdb:8086`
- Các service đã cấu hình sẵn biến môi trường để kết nối.

## Healthcheck
- Mỗi service expose endpoint `/health` trả về `OK`.
- Backtest service có thêm endpoint `/stats` để xem Kafka message statistics.

## Monitoring

### Logs
```bash
# Xem logs price service (Kafka producer)
docker-compose logs -f price-service

# Xem logs backtest service (Kafka consumer)
docker-compose logs -f backtest-service

# Xem logs Kafka
docker-compose logs -f kafka
```

## Lưu ý
- Mỗi service có Dockerfile riêng, build độc lập.
- Khi phát triển, có thể chỉ chạy từng service và Kafka/Redis bằng docker-compose:
  ```bash
  docker-compose up kafka redis influxdb
  # hoặc chỉ service cần thiết
  ```
- Đảm bảo Kafka/Zookeeper và Redis đã chạy trước khi test các service phụ thuộc.
- Price Service cần InfluxDB để lưu trữ historical data.
- Backtest Service chỉ cần Kafka để nhận price updates.

## Thư mục
- `services/`: Chứa các microservice
- `gateway/`: API Gateway
- `frontend/`: React app
- `infra/`: Hạ tầng Kafka, Redis
- `test-kafka.py`: Script test Kafka producer/consumer