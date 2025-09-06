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
    }

    public class BacktestResult
    {
        public Guid Id { get; set; }
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
        public long OpenTime { get; set; }
        public decimal Open { get; set; }
        public decimal High { get; set; }
        public decimal Low { get; set; }
        public decimal Close { get; set; }
        public decimal Volume { get; set; }
        public long CloseTime { get; set; }
    }

    public class PriceDataResponse
    {
        public List<CandleData> Data { get; set; } = new();
    }
}
