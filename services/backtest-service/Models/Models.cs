using System.ComponentModel.DataAnnotations;

namespace BacktestService.Models
{
    public class BacktestRequest
    {
        [Required]
        public string Symbol { get; set; } = string.Empty;
        
        [Required]
        public string Interval { get; set; } = string.Empty;
        
        public DateTime StartDate { get; set; }
        
        public DateTime EndDate { get; set; }
        
        public decimal InitialBalance { get; set; } = 10000;
        
        public decimal Commission { get; set; } = 0.001m;
        
        public string Strategy { get; set; } = "AI_PREDICTION";
        
        public Dictionary<string, object>? Parameters { get; set; }

        public decimal MaxDrawdown { get; set; } = 0.1m;
        
        public decimal StopLoss { get; set; } = 0.05m;
        
        public decimal TakeProfit { get; set; } = 0.1m;
        
        public string? UserId { get; set; }
    }

    public class BacktestResult
    {
        public Guid Id { get; set; }
        public string UserId { get; set; } = string.Empty;
        public string Symbol { get; set; } = string.Empty;
        public string Interval { get; set; } = string.Empty;
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public decimal InitialBalance { get; set; }
        public decimal FinalBalance { get; set; }
        public decimal TotalReturn { get; set; }
        public decimal TotalReturnPercent { get; set; }
        public int TotalTrades { get; set; }
        public int WinningTrades { get; set; }
        public int LosingTrades { get; set; }
        public decimal WinRate { get; set; }
        public decimal MaxDrawdown { get; set; }
        public decimal SharpeRatio { get; set; }
        public decimal Accuracy { get; set; }
        public decimal Precision { get; set; }
        public decimal Recall { get; set; }
        public decimal F1Score { get; set; }
        public DateTime CreatedAt { get; set; }
        public List<Trade> Trades { get; set; } = new();
        public List<PerformancePoint> PerformanceHistory { get; set; } = new();
    }

    public class Trade
    {
        public Guid Id { get; set; }
        public Guid BacktestResultId { get; set; }
        public DateTime Timestamp { get; set; }
        public string Type { get; set; } = string.Empty; // BUY, SELL
        public decimal Price { get; set; }
        public decimal Quantity { get; set; }
        public decimal Commission { get; set; }
        public decimal PnL { get; set; }
        [MaxLength(200)]
        public string Reason { get; set; } = string.Empty; // AI_PREDICTION, STOP_LOSS, TAKE_PROFIT
        public bool IsCorrect { get; set; }
    }

    public class PerformancePoint
    {
        public Guid Id { get; set; }
        public Guid BacktestResultId { get; set; }
        public DateTime Timestamp { get; set; }
        public decimal Balance { get; set; }
        public decimal Equity { get; set; }
        public decimal Drawdown { get; set; }
    }

    public class AiPrediction
    {
        public string Symbol { get; set; } = string.Empty;
        public string Interval { get; set; } = string.Empty;
        public decimal LastClose { get; set; }
        public decimal PredictedNextClose { get; set; }
        public string Trend { get; set; } = string.Empty; // UP, DOWN
        public decimal ChangePercent { get; set; }
        public decimal Confidence { get; set; }
    }

    public class CandleData
    {
        public string Symbol { get; set; } = string.Empty;
        public string Interval { get; set; } = string.Empty;
        public decimal Open { get; set; }
        public decimal High { get; set; }
        public decimal Low { get; set; }
        public decimal Close { get; set; }
        public decimal Volume { get; set; }
        [System.Text.Json.Serialization.JsonPropertyName("close_time")]
        public long CloseTime { get; set; }
        
        // Property để tương thích với code cũ
        public long OpenTime
        {
            get
            {
                // Tính toán OpenTime dựa trên CloseTime và interval
                var intervalMs = GetIntervalInMilliseconds(Interval);
                return CloseTime - intervalMs + 1; // +1 để tránh overlap
            }
            set
            {
                // Cho phép set để tương thích với mock data
                var intervalMs = GetIntervalInMilliseconds(Interval);
                CloseTime = value + intervalMs - 1;
            }
        }
        
        private long GetIntervalInMilliseconds(string interval)
        {
            return interval?.ToLower() switch
            {
                "1m" => 60000,
                "5m" => 300000,
                "15m" => 900000,
                "1h" => 3600000,
                "6h" => 21600000,
                "1d" => 86400000,
                _ => 3600000 // default 1h
            };
        }
    }

    public class PriceDataResponse
    {
        public List<CandleData> Data { get; set; } = new();
    }
}
