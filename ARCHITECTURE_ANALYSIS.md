# PHÂN TÍCH KIẾN TRÚC HỆ THỐNG FINANCIAL ANALYTICS

## TỔNG QUAN DỰ ÁN
Đây là một hệ thống microservices phức tạp được thiết kế để phân tích tài chính và dự đoán giá cryptocurrency. Hệ thống sử dụng kiến trúc microservices với API Gateway, message queuing, và các công nghệ AI/ML.

## KIẾN TRÚC TỔNG THỂ

### 1. PATTERN KIẾN TRÚC
- **Microservices Architecture**: Hệ thống được chia thành nhiều services độc lập
- **API Gateway Pattern**: Sử dụng Spring Cloud Gateway làm entry point
- **Event-Driven Architecture**: Sử dụng Kafka cho message queuing
- **CQRS Pattern**: Tách biệt read/write operations
- **Data Lake Pattern**: Sử dụng InfluxDB cho time-series data

### 2. LAYER KIẾN TRÚC
```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND LAYER                          │
│  React.js + TailwindCSS + TradingView Widgets             │
└─────────────────────────────────────────────────────────────┘
                                │
┌─────────────────────────────────────────────────────────────┐
│                    API GATEWAY LAYER                       │
│  Spring Cloud Gateway + Rate Limiting + Authentication    │
└─────────────────────────────────────────────────────────────┘
                                │
┌─────────────────────────────────────────────────────────────┐
│                  MICROSERVICES LAYER                       │
│  Auth | User | Price | AI | Backtest | Crawler | News     │
└─────────────────────────────────────────────────────────────┘
                                │
┌─────────────────────────────────────────────────────────────┐
│                    MESSAGE LAYER                           │
│  Apache Kafka + Zookeeper                                  │
└─────────────────────────────────────────────────────────────┘
                                │
┌─────────────────────────────────────────────────────────────┐
│                    DATA LAYER                              │
│  PostgreSQL | MongoDB | InfluxDB | Redis | MinIO          │
└─────────────────────────────────────────────────────────────┘
```

## CHI TIẾT CÁC SERVICES

### 1. API GATEWAY (Spring Cloud Gateway)
**Công nghệ**: Java 17, Spring Boot 3.2.12, Spring Cloud Gateway
**Port**: 8080
**Chức năng**:
- Routing requests đến các microservices
- Rate limiting với Redis
- Authentication/Authorization
- Load balancing
- Circuit breaker pattern

**Cấu hình routing**:
- `/api/auth/**` → auth-service:8087
- `/api/user/**` → user-service:8088
- `/api/price/**` → price-service:8081
- `/api/backtest/**` → backtest-service:8080
- `/api/ai-predict/**` → ai-predict-service:8084
- `/api/crawler/**` → crawler:8000
- `/ws/**` → price-service WebSocket

### 2. AUTH SERVICE
**Công nghệ**: .NET 8.0, ASP.NET Core, Entity Framework Core
**Port**: 8087
**Database**: PostgreSQL
**Chức năng**:
- User authentication (JWT)
- User registration/login
- Password management
- Token refresh
- Integration với User Service

**Dependencies**:
- PostgreSQL (user data)
- Redis (caching)
- Kafka (event publishing)

### 3. USER SERVICE
**Công nghệ**: Node.js, Express.js, Mongoose
**Port**: 8088
**Database**: MongoDB
**Chức năng**:
- User profile management
- User preferences
- Watchlist management
- Kafka consumer cho user events

**Dependencies**:
- MongoDB (user profiles)
- Redis (caching)
- Kafka (event consumption)

### 4. PRICE SERVICE
**Công nghệ**: Python, FastAPI, WebSockets
**Port**: 8081
**Databases**: InfluxDB (time-series), Redis (caching)
**Chức năng**:
- Real-time price data collection
- WebSocket connections cho live data
- Historical price data storage
- Price data API endpoints
- Kafka producer cho price events

**Features**:
- WebSocket manager cho multiple intervals
- InfluxDB integration cho time-series data
- Redis caching cho performance
- Real-time data streaming

### 5. AI PREDICT SERVICE
**Công nghệ**: Python, FastAPI, scikit-learn, LightGBM, XGBoost
**Port**: 8084
**Storage**: MinIO (model storage)
**Chức năng**:
- Price prediction using ML models
- Model loading và inference
- Sentiment analysis integration
- Model versioning

**ML Models**:
- LightGBM và XGBoost cho price prediction
- Pre-trained models cho multiple symbols và intervals
- Sentiment analysis models

### 6. AI TRAIN SERVICE
**Công nghệ**: Python, scikit-learn, pandas
**Chức năng**:
- Model training và retraining
- Data preprocessing
- Feature engineering
- Model evaluation
- Model deployment

**Training Data**:
- Historical price data
- Sentiment data (Fear & Greed Index)
- Technical indicators

### 7. BACKTEST SERVICE
**Công nghệ**: .NET 8.0, ASP.NET Core, Entity Framework Core
**Port**: 8080 (exposed), 8080 (internal)
**Database**: SQL Server
**Chức năng**:
- Strategy backtesting
- Performance metrics calculation
- Trading strategy simulation
- Historical analysis

**Strategy Pattern**:
- BaseStrategy abstract class
- Multiple strategy implementations
- Strategy factory pattern
- Parameterized strategies

### 8. CRAWLER SERVICE
**Công nghệ**: Python, BeautifulSoup, Binance API, ccxt
**Port**: 8000
**Chức năng**:
- Data collection từ multiple sources
- News crawling và sentiment analysis
- Price data collection từ exchanges
- Data warehouse integration

**Data Sources**:
- Binance API
- News websites
- Social media sentiment
- Fear & Greed Index

### 9. NEWS SERVICE
**Công nghệ**: Python, FastAPI
**Port**: 8083 (commented out)
**Chức năng**:
- News aggregation
- Sentiment analysis
- News filtering và categorization

### 10. NOTIFICATION SERVICE
**Công nghệ**: Go, Kafka
**Chức năng**:
- Event processing
- Notification delivery
- Message queuing

## DATABASE ARCHITECTURE

### 1. POSTGRESQL (Auth Service)
- User authentication data
- Refresh tokens
- User roles và permissions

### 2. MONGODB (User Service)
- User profiles
- User preferences
- Watchlists
- User settings

### 3. INFLUXDB (Price Service)
- Time-series price data
- OHLCV data
- Technical indicators
- Real-time metrics

### 4. SQL SERVER (Backtest Service)
- Backtest results
- Strategy configurations
- Performance metrics
- Trade history

### 5. REDIS (Caching Layer)
- Session storage
- API response caching
- Rate limiting counters
- Real-time data caching

### 6. MINIO (Object Storage)
- ML model storage
- Model artifacts
- Data files
- Backup storage

## MESSAGE QUEUING (KAFKA)

### Topics Structure:
- **price-data**: Real-time price updates
- **user-events**: User actions và changes
- **auth-events**: Authentication events
- **prediction-requests**: AI prediction requests
- **backtest-results**: Backtest completion events

### Kafka Configuration:
- **Broker**: kafka:29092
- **Zookeeper**: zookeeper:2181
- **Auto topic creation**: Enabled
- **Replication factor**: 1 (development)

## COMMUNICATION PATTERNS

### 1. SYNCHRONOUS COMMUNICATION
- HTTP/REST APIs giữa services
- WebSocket cho real-time data
- Direct service-to-service calls

### 2. ASYNCHRONOUS COMMUNICATION
- Kafka message queuing
- Event-driven architecture
- Pub/Sub pattern

### 3. DATA FLOW
```
Crawler → Price Service → InfluxDB
                ↓
        Kafka → AI Predict Service
                ↓
        Backtest Service ← User Service
                ↓
        Frontend (Real-time updates)
```

## SECURITY ARCHITECTURE

### 1. AUTHENTICATION
- JWT tokens
- Token refresh mechanism
- Stateless authentication

### 2. AUTHORIZATION
- Role-based access control
- Service-level permissions
- API endpoint protection

### 3. RATE LIMITING
- Redis-based rate limiting
- Per-IP rate limits
- Service-specific limits

### 4. SECURITY HEADERS
- Helmet.js cho security headers
- CORS configuration
- Input validation

## DEPLOYMENT ARCHITECTURE

### 1. CONTAINERIZATION
- Docker containers cho tất cả services
- Multi-stage builds
- Optimized images

### 2. ORCHESTRATION
- Docker Compose cho development
- Service discovery
- Health checks

### 3. VOLUME MANAGEMENT
- Persistent volumes cho databases
- Shared volumes cho data
- Backup strategies

## MONITORING & OBSERVABILITY

### 1. HEALTH CHECKS
- Service health endpoints
- Database connectivity checks
- Dependency health monitoring

### 2. LOGGING
- Structured logging
- Centralized log collection
- Error tracking

### 3. METRICS
- Performance metrics
- Business metrics
- System metrics

## SCALABILITY CONSIDERATIONS

### 1. HORIZONTAL SCALING
- Stateless services
- Load balancer ready
- Database sharding potential

### 2. VERTICAL SCALING
- Resource optimization
- Memory management
- CPU optimization

### 3. CACHING STRATEGY
- Redis caching
- Application-level caching
- Database query optimization

## TECHNOLOGY STACK SUMMARY

### Frontend:
- React.js 18.2.0
- TailwindCSS 3.2.0
- TradingView Widgets
- Lightweight Charts
- Ant Design

### Backend Services:
- **.NET 8.0**: Auth Service, Backtest Service
- **Node.js**: User Service
- **Python**: Price Service, AI Services, Crawler
- **Go**: Notification Service
- **Java 17**: API Gateway

### Databases:
- **PostgreSQL**: Auth data
- **MongoDB**: User profiles
- **InfluxDB**: Time-series data
- **SQL Server**: Backtest data
- **Redis**: Caching
- **MinIO**: Object storage

### Message Queue:
- **Apache Kafka**: Event streaming
- **Zookeeper**: Kafka coordination

### Infrastructure:
- **Docker**: Containerization
- **Docker Compose**: Orchestration
- **Nginx**: Reverse proxy (frontend)

## DEVELOPMENT WORKFLOW

### 1. SERVICE DEVELOPMENT
- Independent development
- API-first approach
- Contract testing

### 2. TESTING STRATEGY
- Unit testing
- Integration testing
- End-to-end testing

### 3. DEPLOYMENT PIPELINE
- Container-based deployment
- Environment-specific configurations
- Health check validation

## KẾT LUẬN

Hệ thống này được thiết kế theo kiến trúc microservices hiện đại với các đặc điểm chính:

1. **Tính mở rộng cao**: Có thể scale từng service độc lập
2. **Fault tolerance**: Service isolation và circuit breaker
3. **Real-time capabilities**: WebSocket và Kafka integration
4. **AI/ML integration**: Sophisticated prediction models
5. **Data diversity**: Multiple database types cho different use cases
6. **Modern tech stack**: Sử dụng các công nghệ mới nhất

Hệ thống phù hợp cho việc xây dựng một platform phân tích tài chính chuyên nghiệp với khả năng dự đoán giá và backtesting strategies.
