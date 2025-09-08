using BacktestService.Models;

namespace BacktestService.Services
{
    public class StrategyBacktestEngine
    {
        private readonly IPriceService _priceService;
        private readonly IAiService _aiService;
        private readonly IPerformanceMetricsService _metricsService;
        private readonly ILogger<StrategyBacktestEngine> _logger;

        public StrategyBacktestEngine(
            IPriceService priceService,
            IAiService aiService,
            IPerformanceMetricsService metricsService,
            ILogger<StrategyBacktestEngine> logger)
        {
            _priceService = priceService;
            _aiService = aiService;
            _metricsService = metricsService;
            _logger = logger;
        }

        public async Task<BacktestResult> RunBacktestAsync(BacktestRequest request)
        {
            _logger.LogInformation("Starting backtest for {Symbol} {Interval} with strategy {Strategy}", 
                request.Symbol, request.Interval, request.Strategy);

            // Validate strategy
            if (!StrategyFactory.IsStrategyRegistered(request.Strategy))
            {
                throw new ArgumentException($"Strategy '{request.Strategy}' is not registered");
            }

            // Get strategy info
            var strategyInfo = StrategyFactory.GetStrategyInfo(request.Strategy);
            if (strategyInfo == null)
            {
                throw new InvalidOperationException($"Strategy info not found for '{request.Strategy}'");
            }

            // Create and initialize strategy
            var strategyParameters = CreateStrategyParameters(request, strategyInfo);
            var strategy = StrategyFactory.CreateStrategy(request.Strategy, strategyParameters);

            // Get historical data
            var historicalData = await _priceService.GetHistoricalDataAsync(
                request.Symbol, request.Interval, request.StartDate, request.EndDate);

            if (historicalData.Count < strategyInfo.MinimumDataPoints)
            {
                throw new InvalidOperationException(
                    $"Insufficient data points. Required: {strategyInfo.MinimumDataPoints}, Available: {historicalData.Count}");
            }

            // Initialize backtest state
            var result = new BacktestResult
            {
                Id = Guid.NewGuid(),
                UserId = request.UserId ?? string.Empty,
                Symbol = request.Symbol,
                Interval = request.Interval,
                StartDate = request.StartDate,
                EndDate = request.EndDate,
                InitialBalance = request.InitialBalance,
                FinalBalance = request.InitialBalance,
                CreatedAt = DateTime.UtcNow
            };

            var context = new TradingContext
            {
                CurrentBalance = request.InitialBalance,
                CurrentPosition = 0,
                PerformanceHistory = new List<PerformancePoint>()
            };

            // Run backtest
            await RunBacktestLoop(strategy, context, historicalData, request, result);

            // Calculate final metrics
            CalculateFinalMetrics(result, context);

            _logger.LogInformation("Completed backtest {Id} with final balance {FinalBalance}", 
                result.Id, result.FinalBalance);

            return result;
        }

        private StrategyParameters CreateStrategyParameters(BacktestRequest request, StrategyInfo strategyInfo)
        {
            var parameters = new StrategyParameters();

            // Set default parameters from strategy info
            foreach (var param in strategyInfo.DefaultParameters)
            {
                parameters.SetParameter(param.Key, param.Value);
            }

            // Override with request parameters
            if (request.Parameters != null)
            {
                foreach (var param in request.Parameters)
                {
                    parameters.SetParameter(param.Key, param.Value);
                }
            }

            // Set risk management parameters
            parameters.SetParameter("MaxDrawdown", request.MaxDrawdown);
            parameters.SetParameter("StopLoss", request.StopLoss);
            parameters.SetParameter("TakeProfit", request.TakeProfit);

            return parameters;
        }

        private async Task RunBacktestLoop(
            ITradingStrategy strategy,
            TradingContext context,
            List<CandleData> historicalData,
            BacktestRequest request,
            BacktestResult result)
        {
            var position = 0m;
            var entryPrice = 0m;
            var stopLossPrice = 0m;
            var takeProfitPrice = 0m;

            for (int i = 0; i < historicalData.Count; i++)
            {
                var candle = historicalData[i];
                context.CurrentCandle = candle;
                context.CurrentPrice = candle.Close;
                context.CurrentTime = DateTimeOffset.FromUnixTimeMilliseconds(candle.CloseTime).DateTime;
                context.HistoricalData = historicalData.Take(i + 1).ToList();

                // Get AI prediction if strategy requires it
                if (strategy.RequiresAI && i > 0)
                {
                    try
                    {
                        context.AiPrediction = await _aiService.GetPredictionAsync(
                            request.Symbol, request.Interval, context.HistoricalData);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "Failed to get AI prediction for candle {Index}", i);
                    }
                }

                // Generate trading signal
                var signal = strategy.GenerateSignal(context);

                // Execute trades based on signal
                if (signal.Type == SignalType.BUY && position <= 0)
                {
                    // Buy signal
                    var quantity = context.CurrentBalance / candle.Close;
                    var commission = quantity * candle.Close * request.Commission;
                    
                    if (commission < context.CurrentBalance)
                    {
                        position = quantity;
                        entryPrice = candle.Close;
                        stopLossPrice = entryPrice * (1 - request.StopLoss);
                        takeProfitPrice = entryPrice * (1 + request.TakeProfit);
                        
                        context.CurrentBalance -= commission;
                        context.CurrentPosition = position;

                        var trade = new Trade
                        {
                            Id = Guid.NewGuid(),
                            BacktestResultId = result.Id,
                            Timestamp = context.CurrentTime,
                            Type = "BUY",
                            Price = candle.Close,
                            Quantity = quantity,
                            Commission = commission,
                            PnL = 0,
                            Reason = signal.Reason,
                            IsCorrect = false // Will be updated later
                        };

                        context.AddTrade(trade);
                        result.Trades.Add(trade);
                    }
                }
                else if (signal.Type == SignalType.SELL && position > 0)
                {
                    // Sell signal
                    var sellValue = position * candle.Close;
                    var commission = sellValue * request.Commission;
                    var pnl = sellValue - (position * entryPrice) - commission;

                    context.CurrentBalance += sellValue - commission;
                    context.CurrentPosition = 0;

                    var trade = new Trade
                    {
                        Id = Guid.NewGuid(),
                        BacktestResultId = result.Id,
                        Timestamp = context.CurrentTime,
                        Type = "SELL",
                        Price = candle.Close,
                        Quantity = position,
                        Commission = commission,
                        PnL = pnl,
                        Reason = signal.Reason,
                        IsCorrect = pnl > 0
                    };

                    context.AddTrade(trade);
                    result.Trades.Add(trade);

                    position = 0;
                    entryPrice = 0;
                    stopLossPrice = 0;
                    takeProfitPrice = 0;
                }

                // Check stop loss and take profit
                if (position > 0)
                {
                    if (candle.Close <= stopLossPrice || candle.Close >= takeProfitPrice)
                    {
                        var sellValue = position * candle.Close;
                        var commission = sellValue * request.Commission;
                        var pnl = sellValue - (position * entryPrice) - commission;

                        context.CurrentBalance += sellValue - commission;
                        context.CurrentPosition = 0;

                        var reason = candle.Close <= stopLossPrice ? "STOP_LOSS" : "TAKE_PROFIT";
                        var trade = new Trade
                        {
                            Id = Guid.NewGuid(),
                            BacktestResultId = result.Id,
                            Timestamp = context.CurrentTime,
                            Type = "SELL",
                            Price = candle.Close,
                            Quantity = position,
                            Commission = commission,
                            PnL = pnl,
                            Reason = reason,
                            IsCorrect = pnl > 0
                        };

                        context.AddTrade(trade);
                        result.Trades.Add(trade);

                        position = 0;
                        entryPrice = 0;
                        stopLossPrice = 0;
                        takeProfitPrice = 0;
                    }
                }

                // Update performance history
                var equity = context.CurrentBalance + (position * candle.Close);
                var performancePoint = new PerformancePoint
                {
                    Id = Guid.NewGuid(),
                    BacktestResultId = result.Id,
                    Timestamp = context.CurrentTime,
                    Balance = context.CurrentBalance,
                    Equity = equity,
                    Drawdown = 0 // Will be calculated later
                };

                context.AddPerformancePoint(performancePoint);
                result.PerformanceHistory.Add(performancePoint);
            }

            // Close any remaining position
            if (position > 0)
            {
                var lastPrice = historicalData.Last().Close;
                var sellValue = position * lastPrice;
                var commission = sellValue * request.Commission;
                var pnl = sellValue - (position * entryPrice) - commission;

                context.CurrentBalance += sellValue - commission;

                var trade = new Trade
                {
                    Id = Guid.NewGuid(),
                    BacktestResultId = result.Id,
                    Timestamp = context.CurrentTime,
                    Type = "SELL",
                    Price = lastPrice,
                    Quantity = position,
                    Commission = commission,
                    PnL = pnl,
                    Reason = "END_OF_BACKTEST",
                    IsCorrect = pnl > 0
                };

                context.AddTrade(trade);
                result.Trades.Add(trade);
            }

            result.FinalBalance = context.CurrentBalance;
        }

        private void CalculateFinalMetrics(BacktestResult result, TradingContext context)
        {
            result.TotalReturn = result.FinalBalance - result.InitialBalance;
            result.TotalReturnPercent = result.InitialBalance > 0 ? 
                (result.TotalReturn / result.InitialBalance) * 100 : 0;

            result.TotalTrades = result.Trades.Count;
            result.WinningTrades = result.Trades.Count(t => t.PnL > 0);
            result.LosingTrades = result.Trades.Count(t => t.PnL < 0);

            result.WinRate = result.TotalTrades > 0 ? 
                (decimal)result.WinningTrades / result.TotalTrades * 100 : 0;

            result.Accuracy = _metricsService.CalculateAccuracy(result.Trades);
            result.Precision = _metricsService.CalculatePrecision(result.Trades);
            result.Recall = _metricsService.CalculateRecall(result.Trades);
            result.F1Score = _metricsService.CalculateF1Score(result.Precision, result.Recall);
            result.SharpeRatio = _metricsService.CalculateSharpeRatio(result.PerformanceHistory);
            result.MaxDrawdown = _metricsService.CalculateMaxDrawdown(result.PerformanceHistory);
        }
    }
}

