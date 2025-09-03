using BacktestService.Data;
using BacktestService.Models;

namespace BacktestService.Services
{
    public class PerformanceMetricsService : IPerformanceMetricsService
    {
        public decimal CalculateAccuracy(List<Trade> trades)
        {
            if (!trades.Any()) return 0;
            return (decimal)trades.Count(t => t.IsCorrect) / trades.Count;
        }

        public decimal CalculatePrecision(List<Trade> trades)
        {
            var winningTrades = trades.Where(t => t.PnL > 0).ToList();
            if (!winningTrades.Any()) return 0;
            return (decimal)winningTrades.Count(t => t.IsCorrect) / winningTrades.Count;
        }

        public decimal CalculateRecall(List<Trade> trades)
        {
            var correctTrades = trades.Where(t => t.IsCorrect).ToList();
            if (!correctTrades.Any()) return 0;
            return (decimal)correctTrades.Count(t => t.PnL > 0) / correctTrades.Count;
        }

        public decimal CalculateF1Score(decimal precision, decimal recall)
        {
            if (precision + recall == 0) return 0;
            return 2 * (precision * recall) / (precision + recall);
        }

        public decimal CalculateSharpeRatio(List<PerformancePoint> performanceHistory, decimal riskFreeRate = 0.02m)
        {
            if (performanceHistory.Count < 2) return 0;

            var returns = new List<decimal>();
            for (int i = 1; i < performanceHistory.Count; i++)
            {
                var returnRate = (performanceHistory[i].Equity - performanceHistory[i - 1].Equity) / performanceHistory[i - 1].Equity;
                returns.Add(returnRate);
            }

            if (!returns.Any()) return 0;

            var avgReturn = returns.Average();
            var variance = returns.Select(r => (r - avgReturn) * (r - avgReturn)).Average();
            var stdDev = (decimal)Math.Sqrt((double)variance);

            if (stdDev == 0) return 0;

            return (avgReturn - riskFreeRate) / stdDev;
        }

        public decimal CalculateMaxDrawdown(List<PerformancePoint> performanceHistory)
        {
            if (!performanceHistory.Any()) return 0;

            decimal maxDrawdown = 0;
            decimal peak = performanceHistory[0].Equity;

            foreach (var point in performanceHistory)
            {
                if (point.Equity > peak)
                {
                    peak = point.Equity;
                }

                var drawdown = (peak - point.Equity) / peak;
                if (drawdown > maxDrawdown)
                {
                    maxDrawdown = drawdown;
                }
            }

            return maxDrawdown;
        }

        public decimal CalculateWinRate(List<Trade> trades)
        {
            if (!trades.Any()) return 0;
            return (decimal)trades.Count(t => t.PnL > 0) / trades.Count;
        }
    }
}
