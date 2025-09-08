using BacktestService.Data;
using BacktestService.Models;
using Microsoft.EntityFrameworkCore;

namespace BacktestService.Services
{
    public class BacktestEngine : IBacktestService
    {
        private readonly BacktestDbContext _context;
        private readonly IAiService _aiService;
        private readonly IPriceService _priceService;
        private readonly IPerformanceMetricsService _metricsService;
        private readonly ILogger<BacktestEngine> _logger;

        public BacktestEngine(
            BacktestDbContext context,
            IAiService aiService,
            IPriceService priceService,
            IPerformanceMetricsService metricsService,
            ILogger<BacktestEngine> logger)
        {
            _context = context;
            _aiService = aiService;
            _priceService = priceService;
            _metricsService = metricsService;
            _logger = logger;
        }

        public async Task<BacktestResult> RunBacktestAsync(BacktestRequest request)
        {
            _logger.LogInformation("Starting backtest for {Symbol} {Interval} from {StartDate} to {EndDate}", 
                request.Symbol, request.Interval, request.StartDate, request.EndDate);

            // Get historical data
            var historicalData = await _priceService.GetHistoricalDataAsync(
                request.Symbol, request.Interval, request.StartDate, request.EndDate);

            if (!historicalData.Any())
            {
                throw new Exception("No historical data available for the specified period");
            }

            // Initialize backtest state
            var result = new BacktestResult
            {
                Id = Guid.NewGuid(),
                UserId = request.UserId,
                Symbol = request.Symbol,
                Interval = request.Interval,
                StartDate = request.StartDate,
                EndDate = request.EndDate,
                InitialBalance = request.InitialBalance,
                CreatedAt = DateTime.UtcNow
            };

            var currentBalance = request.InitialBalance;
            var position = 0m; // Current position size
            var entryPrice = 0m;
            var trades = new List<Trade>();
            var performanceHistory = new List<PerformancePoint>();

            // Run backtest
            for (int i = 20; i < historicalData.Count - 1; i++) // Start from 20 to have enough data for AI
            {
                var currentCandle = historicalData[i];
                var nextCandle = historicalData[i + 1];
                var currentTime = DateTimeOffset.FromUnixTimeMilliseconds(currentCandle.OpenTime).DateTime;

                // Get AI prediction using last 20 candles
                var predictionData = historicalData.Skip(Math.Max(0, i - 19)).Take(20).ToList();
                var prediction = await _aiService.GetPredictionAsync(request.Symbol, request.Interval, predictionData);

                // Trading logic based on AI prediction
                var shouldBuy = prediction.Trend == "UP" && prediction.Confidence > 0.6m && position == 0;
                var shouldSell = prediction.Trend == "DOWN" && prediction.Confidence > 0.6m && position > 0;

                // Execute trades
                if (shouldBuy)
                {
                    var quantity = currentBalance * 0.95m / currentCandle.Close; // Use 95% of balance
                    var commission = quantity * currentCandle.Close * request.Commission;
                    
                    var trade = new Trade
                    {
                        Id = Guid.NewGuid(),
                        BacktestResultId = result.Id,
                        Timestamp = currentTime,
                        Type = "BUY",
                        Price = currentCandle.Close,
                        Quantity = quantity,
                        Commission = commission,
                        PnL = 0,
                        Reason = "AI_PREDICTION",
                        IsCorrect = nextCandle.Close > currentCandle.Close
                    };

                    trades.Add(trade);
                    position = quantity;
                    entryPrice = currentCandle.Close;
                    currentBalance -= quantity * currentCandle.Close + commission;
                }
                else if (shouldSell && position > 0)
                {
                    var sellValue = position * currentCandle.Close;
                    var commission = sellValue * request.Commission;
                    var pnl = sellValue - (position * entryPrice) - commission;

                    var trade = new Trade
                    {
                        Id = Guid.NewGuid(),
                        BacktestResultId = result.Id,
                        Timestamp = currentTime,
                        Type = "SELL",
                        Price = currentCandle.Close,
                        Quantity = position,
                        Commission = commission,
                        PnL = pnl,
                        Reason = "AI_PREDICTION",
                        IsCorrect = pnl > 0
                    };

                    trades.Add(trade);
                    currentBalance += sellValue - commission;
                    position = 0;
                    entryPrice = 0;
                }

                // Calculate current equity
                var currentEquity = currentBalance + (position * currentCandle.Close);
                var drawdown = _metricsService.CalculateMaxDrawdown(performanceHistory);

                performanceHistory.Add(new PerformancePoint
                {
                    Id = Guid.NewGuid(),
                    BacktestResultId = result.Id,
                    Timestamp = currentTime,
                    Balance = currentBalance,
                    Equity = currentEquity,
                    Drawdown = drawdown
                });
            }

            // Close any remaining position
            if (position > 0)
            {
                var lastCandle = historicalData.Last();
                var sellValue = position * lastCandle.Close;
                var commission = sellValue * request.Commission;
                var pnl = sellValue - (position * entryPrice) - commission;
                currentBalance += sellValue - commission;

                trades.Add(new Trade
                {
                    Id = Guid.NewGuid(),
                    BacktestResultId = result.Id,
                    Timestamp = DateTimeOffset.FromUnixTimeMilliseconds(lastCandle.OpenTime).DateTime,
                    Type = "SELL",
                    Price = lastCandle.Close,
                    Quantity = position,
                    Commission = commission,
                    PnL = pnl,
                    Reason = "END_OF_PERIOD",
                    IsCorrect = pnl > 0
                });
            }

            // Calculate final metrics
            result.FinalBalance = currentBalance;
            result.TotalReturn = currentBalance - request.InitialBalance;
            result.TotalReturnPercent = (currentBalance - request.InitialBalance) / request.InitialBalance * 100;
            result.TotalTrades = trades.Count;
            result.WinningTrades = trades.Count(t => t.PnL > 0);
            result.LosingTrades = trades.Count(t => t.PnL < 0);
            result.WinRate = _metricsService.CalculateWinRate(trades);
            result.MaxDrawdown = _metricsService.CalculateMaxDrawdown(performanceHistory);
            result.SharpeRatio = _metricsService.CalculateSharpeRatio(performanceHistory);
            result.Accuracy = _metricsService.CalculateAccuracy(trades);
            result.Precision = _metricsService.CalculatePrecision(trades);
            result.Recall = _metricsService.CalculateRecall(trades);
            result.F1Score = _metricsService.CalculateF1Score(result.Precision, result.Recall);
            result.Trades = trades;
            result.PerformanceHistory = performanceHistory;

            // Save to database
            _context.BacktestResults.Add(result);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Backtest completed for {Symbol} {Interval}. Total return: {TotalReturn:F2}%", 
                request.Symbol, request.Interval, result.TotalReturnPercent);

            return result;
        }

        public async Task<BacktestResult?> GetBacktestResultAsync(Guid id)
        {
            return await _context.BacktestResults
                .Include(b => b.Trades)
                .Include(b => b.PerformanceHistory)
                .FirstOrDefaultAsync(b => b.Id == id);
        }

        public async Task<BacktestResult?> GetBacktestResultAsync(Guid id, string userId)
        {
            return await _context.BacktestResults
                .Include(b => b.Trades)
                .Include(b => b.PerformanceHistory)
                .FirstOrDefaultAsync(b => b.Id == id && b.UserId == userId);
        }

        public async Task<List<BacktestResult>> GetBacktestResultsAsync(string? symbol = null, string? interval = null, DateTime? startDate = null, DateTime? endDate = null, string? userId = null)
        {
            var query = _context.BacktestResults.AsQueryable();

            if (!string.IsNullOrEmpty(userId))
                query = query.Where(b => b.UserId == userId);

            if (!string.IsNullOrEmpty(symbol))
                query = query.Where(b => b.Symbol == symbol);

            if (!string.IsNullOrEmpty(interval))
                query = query.Where(b => b.Interval == interval);

            if (startDate.HasValue)
                query = query.Where(b => b.StartDate >= startDate.Value);

            if (endDate.HasValue)
                query = query.Where(b => b.EndDate <= endDate.Value);

            return await query
                .OrderByDescending(b => b.CreatedAt)
                .ToListAsync();
        }

        public async Task DeleteBacktestResultAsync(Guid id)
        {
            var result = await _context.BacktestResults.FindAsync(id);
            if (result != null)
            {
                _context.BacktestResults.Remove(result);
                await _context.SaveChangesAsync();
            }
        }
    }
}
