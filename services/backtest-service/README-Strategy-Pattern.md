# Strategy Pattern Architecture for Backtest Service

## Overview

The backtest service now implements the Strategy Pattern Architecture, providing a flexible and extensible framework for trading strategies. This architecture allows for easy addition of new trading strategies while maintaining clean separation of concerns.

## Architecture Components

### 1. Core Components

#### ITradingStrategy Interface
- **Location**: `Models/ITradingStrategy.cs`
- **Purpose**: Defines the contract for all trading strategies
- **Key Properties**:
  - `StrategyName`: Unique identifier for the strategy
  - `RequiresAI`: Whether the strategy needs AI predictions
  - `MinimumDataPoints`: Minimum historical data required
- **Key Methods**:
  - `Initialize()`: Set up strategy parameters
  - `GenerateSignal()`: Generate trading signals
  - `Reset()`: Reset strategy state
  - `GetMetrics()`: Get strategy performance metrics

#### BaseStrategy Abstract Class
- **Location**: `Models/BaseStrategy.cs`
- **Purpose**: Provides common functionality and template methods
- **Features**:
  - Built-in risk management
  - Metrics collection
  - Template methods for concrete implementations
  - Automatic validation and error handling

#### Concrete Strategy Classes

##### MovingAverageCrossoverStrategy
- **Location**: `Models/Strategies/MovingAverageCrossoverStrategy.cs`
- **Type**: Technical analysis
- **Logic**: Generates signals based on short/long moving average crossovers
- **Parameters**:
  - `ShortPeriod`: Period for short moving average (default: 10)
  - `LongPeriod`: Period for long moving average (default: 20)
  - `Threshold`: Minimum price deviation threshold (default: 0.001)

##### RSIStrategy
- **Location**: `Models/Strategies/RSIStrategy.cs`
- **Type**: Momentum indicator
- **Logic**: Generates signals based on RSI oversold/overbought conditions
- **Parameters**:
  - `Period`: RSI calculation period (default: 14)
  - `OversoldThreshold`: RSI level considered oversold (default: 30)
  - `OverboughtThreshold`: RSI level considered overbought (default: 70)

##### AIPredictionStrategy
- **Location**: `Models/Strategies/AIPredictionStrategy.cs`
- **Type**: AI-based signals
- **Logic**: Generates signals based on AI model predictions
- **Parameters**:
  - `ConfidenceThreshold`: Minimum AI confidence required (default: 0.6)
  - `PredictionThreshold`: Minimum predicted price change (default: 0.02)
  - `UseTrendDirection`: Use trend direction instead of price prediction (default: true)

### 2. Supporting Classes

#### TradingContext
- **Location**: `Models/TradingContext.cs`
- **Purpose**: Contains all data needed for strategy execution
- **Features**:
  - Current candle and historical data
  - Portfolio state (balance, position)
  - AI predictions
  - Performance history
  - Helper methods for data access

#### StrategyParameters
- **Location**: `Models/StrategyParameters.cs`
- **Purpose**: Type-safe parameter management
- **Features**:
  - Generic `GetParameter<T>()` and `SetParameter<T>()` methods
  - Validation and default values
  - Safe parameter access

#### StrategyFactory
- **Location**: `Models/StrategyFactory.cs`
- **Purpose**: Strategy creation and management
- **Features**:
  - Registry pattern for available strategies
  - Strategy metadata and information
  - Factory methods for strategy creation
  - Strategy discovery and validation

### 3. Engine Components

#### StrategyBacktestEngine
- **Location**: `Services/StrategyBacktestEngine.cs`
- **Purpose**: Executes backtests using the strategy pattern
- **Features**:
  - Strategy initialization and validation
  - Historical data processing
  - Trade execution logic
  - Performance tracking
  - Risk management integration

#### BacktestService
- **Location**: `Services/BacktestService.cs`
- **Purpose**: High-level service that coordinates backtest execution
- **Features**:
  - Database operations
  - Strategy validation
  - Result persistence
  - Error handling

## API Endpoints

### Strategy Management
- `GET /api/backtest/strategies` - Get all available strategies
- `GET /api/backtest/strategies/{strategyName}` - Get specific strategy information

### Backtest Execution
- `POST /api/backtest` - Run a new backtest with specified strategy
- `GET /api/backtest/{id}` - Get backtest result by ID
- `GET /api/backtest` - Get all backtest results with filtering
- `DELETE /api/backtest/{id}` - Delete backtest result
- `GET /api/backtest/stats` - Get backtest statistics

## Usage Examples

### Running a Moving Average Crossover Backtest
```json
{
  "symbol": "BTCUSDT",
  "interval": "1h",
  "startDate": "2024-01-01T00:00:00Z",
  "endDate": "2024-01-31T23:59:59Z",
  "initialBalance": 10000,
  "commission": 0.001,
  "strategy": "MOVING_AVERAGE_CROSSOVER",
  "parameters": {
    "ShortPeriod": 10,
    "LongPeriod": 20,
    "Threshold": 0.001
  },
  "maxDrawdown": 0.1,
  "stopLoss": 0.05,
  "takeProfit": 0.1
}
```

### Running an RSI Backtest
```json
{
  "symbol": "ETHUSDT",
  "interval": "4h",
  "startDate": "2024-01-01T00:00:00Z",
  "endDate": "2024-01-31T23:59:59Z",
  "initialBalance": 10000,
  "commission": 0.001,
  "strategy": "RSI",
  "parameters": {
    "Period": 14,
    "OversoldThreshold": 30,
    "OverboughtThreshold": 70
  }
}
```

### Running an AI Prediction Backtest
```json
{
  "symbol": "ADAUSDT",
  "interval": "1d",
  "startDate": "2024-01-01T00:00:00Z",
  "endDate": "2024-01-31T23:59:59Z",
  "initialBalance": 10000,
  "commission": 0.001,
  "strategy": "AI_PREDICTION",
  "parameters": {
    "ConfidenceThreshold": 0.7,
    "PredictionThreshold": 0.03,
    "UseTrendDirection": true
  }
}
```

## Adding New Strategies

To add a new trading strategy:

1. **Create the strategy class**:
   ```csharp
   public class MyNewStrategy : BaseStrategy
   {
       public override string StrategyName => "MY_NEW_STRATEGY";
       public override bool RequiresAI => false;
       public override int MinimumDataPoints => 50;

       protected override void InitializeStrategy()
       {
           // Initialize strategy-specific parameters
       }

       protected override TradingSignal GenerateStrategySignal(TradingContext context)
       {
           // Implement your trading logic
           return new TradingSignal
           {
               Type = SignalType.BUY,
               Confidence = 0.8m,
               Reason = "Your signal reason"
           };
       }

       protected override void ResetStrategy()
       {
           // Reset strategy-specific state
       }
   }
   ```

2. **Register the strategy** in `StrategyFactory.RegisterStrategies()`:
   ```csharp
   RegisterStrategy<MyNewStrategy>("MY_NEW_STRATEGY", new StrategyInfo
   {
       Name = "MY_NEW_STRATEGY",
       DisplayName = "My New Strategy",
       Description = "Description of your strategy",
       RequiresAI = false,
       MinimumDataPoints = 50,
       DefaultParameters = new Dictionary<string, object>
       {
           ["Param1"] = "defaultValue"
       },
       Parameters = new List<ParameterInfo>
       {
           new() { Name = "Param1", DisplayName = "Parameter 1", Type = "string", DefaultValue = "defaultValue" }
       }
   });
   ```

## Benefits of the Strategy Pattern

1. **Extensibility**: Easy to add new strategies without modifying existing code
2. **Maintainability**: Each strategy is isolated and can be modified independently
3. **Testability**: Strategies can be unit tested in isolation
4. **Flexibility**: Strategies can be swapped at runtime
5. **Reusability**: Strategies can be reused across different backtest scenarios
6. **Type Safety**: Strong typing for parameters and signals
7. **Risk Management**: Built-in risk management at the base strategy level

## Configuration

The strategy pattern is configured in `Program.cs`:

```csharp
builder.Services.AddScoped<IBacktestService, BacktestService>();
builder.Services.AddScoped<StrategyBacktestEngine>();
builder.Services.AddScoped<IPerformanceMetricsService, PerformanceMetricsService>();
```

## Error Handling

The architecture includes comprehensive error handling:

- Strategy validation before execution
- Parameter validation with meaningful error messages
- Graceful handling of insufficient data
- AI service failure handling
- Database operation error handling

## Performance Considerations

- Strategies are created once per backtest run
- Historical data is processed efficiently
- Database operations are optimized with proper indexing
- Memory usage is controlled through proper disposal of resources

