# Financial Analytics Microservices System - Setup Guide

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose
- Node.js 18+ (for local development)
- Java 17+ (for Spring Boot services)
- Python 3.11+ (for Python services)
- Go 1.24+ (for Go services)

### 1. Clone and Setup
```bash
git clone <your-repo>
cd Financial-Analytics-Microservices-System
```

### 2. Environment Configuration
```bash
# For auth-service
cd services/auth-service
cp env.example .env
# Edit .env with your configuration
```

### 3. Start the System
```bash
# Start all services
docker-compose up --build

# Or start infrastructure only
docker-compose up kafka redis mongodb influxdb
```

## 🔧 Service Configuration

### Auth Service (Port 8087)
- **Environment**: Copy `env.example` to `.env`
- **Dependencies**: MongoDB, Redis
- **Health Check**: `/health`

### Notification Service (Port 8086)
- **Dependencies**: Kafka, Redis
- **Health Check**: `/health`
- **Features**: HTTP server + Kafka publisher/subscriber

### Price Service (Port 8081)
- **Dependencies**: Kafka, Redis, InfluxDB
- **Health Check**: `/health`
- **Features**: WebSocket support, price streaming

### News Service (Port 8082)
- **Dependencies**: Kafka, Redis
- **Health Check**: `/health`

### Backtest Service (Port 8083)
- **Dependencies**: Kafka, Redis
- **Health Check**: `/actuator/health`

### AI Service (Port 8084)
- **Dependencies**: Kafka, Redis
- **Health Check**: `/health`

### User Service (Port 8085)
- **Dependencies**: Kafka, Redis
- **Health Check**: `/actuator/health`

### Gateway (Port 8080)
- **Dependencies**: All services
- **Health Check**: `/health`
- **Routes**: All service endpoints

### Frontend (Port 3000)
- **Dependencies**: Gateway
- **Health Check**: `/` (port 80 internally)

## 🐳 Docker Health Checks

All services now include proper health checks with `curl` installed:
- **Alpine images**: `RUN apk add --no-cache curl`
- **Debian images**: `RUN apt-get update && apt-get install -y curl`

## 🔍 Monitoring

### Health Check Endpoints
- Gateway: `http://localhost:8080/health`
- Auth: `http://localhost:8087/health`
- Notification: `http://localhost:8086/health`
- Price: `http://localhost:8081/health`
- News: `http://localhost:8082/health`
- Backtest: `http://localhost:8083/actuator/health`
- AI: `http://localhost:8084/health`
- User: `http://localhost:8085/actuator/health`
- Frontend: `http://localhost:3000/`

### Infrastructure Health
- MongoDB: `mongodb://localhost:27017`
- Redis: `redis://localhost:6379`
- Kafka: `localhost:9092`
- InfluxDB: `http://localhost:9090`

## 🚨 Troubleshooting

### Common Issues

1. **Health Check Failures**
   - Ensure all services have `curl` installed
   - Check service logs for startup errors
   - Verify port mappings in docker-compose.yml

2. **Service Dependencies**
   - Start infrastructure first: `docker-compose up kafka redis mongodb influxdb`
   - Wait for infrastructure to be healthy before starting services

3. **Port Conflicts**
   - Verify no other services are using the same ports
   - Check `docker ps` for running containers

4. **Environment Variables**
   - Ensure `.env` files are properly configured
   - Check service-specific environment requirements

### Logs and Debugging
```bash
# View all service logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f auth-service

# Check service status
docker-compose ps
```

## 📊 System Architecture

```
Frontend (3000) → Gateway (8080) → Services
                                    ├── Auth (8087)
                                    ├── Notification (8086)
                                    ├── Price (8081)
                                    ├── News (8082)
                                    ├── Backtest (8083)
                                    ├── AI (8084)
                                    └── User (8085)

Infrastructure:
├── MongoDB (27017)
├── Redis (6379)
├── Kafka (9092)
└── InfluxDB (9090)
```

## 🔄 Development Workflow

### Local Development
```bash
# Start only infrastructure
docker-compose up kafka redis mongodb influxdb

# Run services locally
cd services/auth-service && npm run dev
cd services/price-service && python -m uvicorn app.main:app --reload --port 8081
# ... etc
```

### Testing
```bash
# Test auth service
cd services/auth-service
npm test

# Test individual endpoints
curl http://localhost:8087/health
```

## 📝 Notes

- All services now include proper health checks
- Port mappings have been corrected
- Missing dependencies have been added
- Environment templates are provided
- Gateway routing is properly configured

## 🆘 Support

If you encounter issues:
1. Check service logs: `docker-compose logs <service-name>`
2. Verify health endpoints are responding
3. Ensure all dependencies are running
4. Check environment configuration
