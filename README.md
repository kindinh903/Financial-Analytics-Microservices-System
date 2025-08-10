# Financial Analytics Microservices System

## Kiến trúc hệ thống

- **Frontend**: React (port 3000)
- **API Gateway**: Spring Boot (port 8080)
- **Auth Service**: Node.js + MongoDB (port 8087) - JWT Authentication
- **Notification Service**: Go (port 8086)
- **Price Service**: Go (port 8081)
- **News Service**: Python Flask (port 8082)
- **Backtest Service**: Spring Boot (port 8083)
- **AI Service**: Python FastAPI (port 8084)
- **User Service**: Spring Boot (port 8085)
- **Kafka**: (port 9092), **Zookeeper**: (port 2181)
- **Redis**: (port 6379)
- **MongoDB**: (port 27017)

## Chạy toàn bộ hệ thống

```bash
docker-compose up --build
```

- Truy cập frontend: http://localhost:3000
- API Gateway: http://localhost:8080
- Các service expose port riêng, healthcheck tại `/health`.

## Phát triển từng service

### Auth Service (Node.js)
```bash
cd services/auth-service
npm install
cp env.example .env
# Edit .env file with your configuration
npm run dev
```

### Notification, price Service (Go)
```bash
cd services/notification-service # hoặc price-service
go mod tidy
go run main.go
```

### News, ai Service (Py)
```bash
cd services/news-service # hoặc ai-service
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python app.py
```

### Backtest, user, gateway (Java Spring Boot Service )
```bash
cd services/backtest-service # hoặc user-service, gateway
./mvnw spring-boot:run
# hoặc build jar:
mvn clean package
java -jar target/*.jar
```

### Frontend (react)
```bash
cd frontend
npm install
npm start
```

## Kết nối Kafka/Redis/MongoDB
- Kafka broker: `kafka:9092`
- Redis: `redis:6379`
- MongoDB: `mongodb:27017`
- Các service đã cấu hình sẵn biến môi trường để kết nối.

## Healthcheck
- Mỗi service expose endpoint `/health` trả về `OK`.

## Lưu ý
- Mỗi service có Dockerfile riêng, build độc lập.
- Khi phát triển, có thể chỉ chạy từng service và Kafka/Redis bằng docker-compose:
  ```bash
  docker-compose up kafka redis
  # hoặc chỉ service cần thiết
  ```
- Đảm bảo Kafka/Zookeeper và Redis đã chạy trước khi test các service phụ thuộc.

## Thư mục
- `services/`: Chứa các microservice
- `gateway/`: API Gateway
- `frontend/`: React app
- `infra/`: Hạ tầng Kafka, Redis