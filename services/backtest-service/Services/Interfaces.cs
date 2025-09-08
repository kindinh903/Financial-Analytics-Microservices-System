using BacktestService.Models;

namespace BacktestService.Services
{
    public interface IAiService
    {
        Task<AiPrediction> GetPredictionAsync(string symbol, string interval, List<CandleData> historicalData);
    }

    public interface IPriceService
    {
        Task<List<CandleData>> GetHistoricalDataAsync(string symbol, string interval, DateTime startTime, DateTime endTime, int limit = 500);
    }

    public interface IBacktestService
    {
        Task<BacktestResult> RunBacktestAsync(BacktestRequest request);
        Task<BacktestResult?> GetBacktestResultAsync(Guid id);
        Task<List<BacktestResult>> GetBacktestResultsAsync(string? symbol = null, string? interval = null, DateTime? startDate = null, DateTime? endDate = null, string? userId = null);
        Task DeleteBacktestResultAsync(Guid id);
    }

    public interface IPerformanceMetricsService
    {
        decimal CalculateAccuracy(List<Trade> trades);
        decimal CalculatePrecision(List<Trade> trades);
        decimal CalculateRecall(List<Trade> trades);
        decimal CalculateF1Score(decimal precision, decimal recall);
        decimal CalculateSharpeRatio(List<PerformancePoint> performanceHistory, decimal riskFreeRate = 0.02m);
        decimal CalculateMaxDrawdown(List<PerformancePoint> performanceHistory);
        decimal CalculateWinRate(List<Trade> trades);
    }
}
