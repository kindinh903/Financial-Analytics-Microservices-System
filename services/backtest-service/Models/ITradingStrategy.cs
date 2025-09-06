using BacktestService.Models;

namespace BacktestService.Models
{
    public enum SignalType
    {
        BUY,
        SELL,
        HOLD
    }

    public class TradingSignal
    {
        public SignalType Type { get; set; }
        public decimal Confidence { get; set; }
        public string Reason { get; set; } = string.Empty;
        public Dictionary<string, object> Metadata { get; set; } = new();
    }

    public interface ITradingStrategy
    {
        string StrategyName { get; }
        bool RequiresAI { get; }
        int MinimumDataPoints { get; }
        
        void Initialize(StrategyParameters parameters);
        TradingSignal GenerateSignal(TradingContext context);
        void Reset();
        Dictionary<string, object> GetMetrics();
    }
}
