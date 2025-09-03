# Backtest Service - .NET

Backtest service được viết bằng .NET 8, tích hợp với AI-service để thực hiện backtesting dựa trên dự đoán AI.

## Tính năng chính

- **Tích hợp AI Service**: Sử dụng dự đoán từ AI-service để đưa ra quyết định giao dịch
- **Backtesting Engine**: Thực hiện backtesting trên dữ liệu lịch sử với multiple timeframes và symbols
- **Performance Metrics**: Tính toán các metrics hiệu suất (accuracy, precision, recall, ROI, Sharpe ratio, max drawdown)
- **Database Storage**: Lưu trữ và truy vấn kết quả backtest với Entity Framework
- **REST API**: Cung cấp API để chạy backtest và truy vấn kết quả

## Cấu trúc dự án

```
backtest-service/
├── Controllers/
│   └── BacktestController.cs      # API endpoints
├── Data/
│   └── BacktestDbContext.cs       # Entity Framework context
├── Models/
│   └── Models.cs                  # Data models
├── Services/
│   ├── Interfaces.cs              # Service interfaces
│   ├── AiService.cs              # AI service integration
│   ├── PriceService.cs           # Price service integration
│   ├── BacktestEngine.cs         # Core backtesting logic
│   └── PerformanceMetricsService.cs # Performance calculations
├── Program.cs                     # Application entry point
├── BacktestService.csproj        # Project file
├── appsettings.json              # Configuration
└── Dockerfile                    # Docker configuration
```

## API Endpoints

### 1. Chạy Backtest
```
POST /api/backtest
```
**Request Body:**
```json
{
  "symbol": "BTCUSDT",
  "interval": "1h",
  "startDate": "2024-01-01T00:00:00Z",
  "endDate": "2024-01-31T23:59:59Z",
  "initialBalance": 10000,
  "commission": 0.001,
  "strategy": "AI_PREDICTION"
}
```

### 2. Lấy Kết Quả Backtest
```
GET /api/backtest/{id}
```

### 3. Lấy Danh Sách Kết Quả
```
GET /api/backtest?symbol=BTCUSDT&interval=1h
```

### 4. Xóa Kết Quả Backtest
```
DELETE /api/backtest/{id}
```

### 5. Thống Kê Backtest
```
GET /api/backtest/stats?symbol=BTCUSDT
```

## Metrics Tính Toán

- **Accuracy**: Tỷ lệ dự đoán đúng tổng thể
- **Precision**: Tỷ lệ dự đoán đúng trong các giao dịch có lãi
- **Recall**: Tỷ lệ giao dịch có lãi được dự đoán đúng
- **F1-Score**: Harmonic mean của precision và recall
- **Sharpe Ratio**: Risk-adjusted return
- **Max Drawdown**: Mức sụt giảm tối đa
- **Win Rate**: Tỷ lệ giao dịch có lãi
- **Total Return**: Tổng lợi nhuận

## Cấu hình

Service sử dụng các cấu hình trong `appsettings.json`:
- Database connection string
- AI service URL
- Price service URL
- Backtest settings (initial balance, commission, etc.)

## Build và Run

### Local Development
```bash
dotnet restore
dotnet build
dotnet run
```

### Docker
```bash
docker build -t backtest-service .
docker run -p 8080:8080 backtest-service
```

## Tích hợp với Microservices

- **AI Service**: Lấy dự đoán giá từ AI models
- **Price Service**: Lấy dữ liệu giá lịch sử
- **Database**: SQL Server để lưu trữ kết quả backtest

## Trading Logic

Service sử dụng logic giao dịch dựa trên AI prediction:
1. Mua khi AI dự đoán xu hướng UP với confidence > 60%
2. Bán khi AI dự đoán xu hướng DOWN với confidence > 60%
3. Sử dụng 95% balance cho mỗi giao dịch
4. Tính toán commission và PnL cho mỗi giao dịch
5. Theo dõi performance history và drawdown 