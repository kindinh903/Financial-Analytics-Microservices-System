namespace BacktestService.Models
{
    public abstract class BaseStrategy : ITradingStrategy
    {
        protected StrategyParameters Parameters { get; private set; } = new();
        protected Dictionary<string, object> Metrics { get; private set; } = new();
        protected bool IsInitialized { get; private set; } = false;

        public abstract string StrategyName { get; }
        public abstract bool RequiresAI { get; }
        public abstract int MinimumDataPoints { get; }

        public virtual void Initialize(StrategyParameters parameters)
        {
            Parameters = parameters ?? throw new ArgumentNullException(nameof(parameters));
            Metrics.Clear();
            IsInitialized = true;
            
            // Initialize strategy-specific parameters
            InitializeStrategy();
        }

        public virtual TradingSignal GenerateSignal(TradingContext context)
        {
            if (!IsInitialized)
            {
                throw new InvalidOperationException("Strategy must be initialized before generating signals");
            }

            if (!context.HasEnoughData(MinimumDataPoints))
            {
                return new TradingSignal
                {
                    Type = SignalType.HOLD,
                    Confidence = 0,
                    Reason = $"Insufficient data. Required: {MinimumDataPoints}, Available: {context.HistoricalData.Count}"
                };
            }

            // Apply risk management - DISABLED to allow StrategyBacktestEngine to handle stop loss/take profit
            // if (ShouldApplyRiskManagement(context))
            // {
            //     return ApplyRiskManagement(context);
            // }

            // Generate the actual signal
            var signal = GenerateStrategySignal(context);
            
            // Update metrics
            UpdateMetrics(signal, context);
            
            return signal;
        }

        public virtual void Reset()
        {
            Metrics.Clear();
            IsInitialized = false;
            ResetStrategy();
        }

        public virtual Dictionary<string, object> GetMetrics()
        {
            return new Dictionary<string, object>(Metrics);
        }

        // Template methods for concrete classes to implement
        protected abstract void InitializeStrategy();
        protected abstract TradingSignal GenerateStrategySignal(TradingContext context);
        protected abstract void ResetStrategy();

        // Risk management methods
        protected virtual bool ShouldApplyRiskManagement(TradingContext context)
        {
            var maxDrawdown = Parameters.GetParameter<decimal>("MaxDrawdown", 0.1m);
            var currentDrawdown = CalculateCurrentDrawdown(context);
            
            return currentDrawdown >= maxDrawdown;
        }

        protected virtual TradingSignal ApplyRiskManagement(TradingContext context)
        {
            return new TradingSignal
            {
                Type = SignalType.SELL,
                Confidence = 1.0m,
                Reason = "Risk management: Maximum drawdown reached"
            };
        }

        protected virtual decimal CalculateCurrentDrawdown(TradingContext context)
        {
            if (context.PerformanceHistory.Count < 2)
                return 0;

            var peak = context.PerformanceHistory.Max(p => p.Balance);
            var current = context.CurrentBalance;
            
            return peak > 0 ? (peak - current) / peak : 0;
        }

        protected virtual void UpdateMetrics(TradingSignal signal, TradingContext context)
        {
            var signalCount = Metrics.GetValueOrDefault("SignalCount", 0);
            Metrics["SignalCount"] = (int)signalCount + 1;

            var buySignals = Metrics.GetValueOrDefault("BuySignals", 0);
            var sellSignals = Metrics.GetValueOrDefault("SellSignals", 0);
            var holdSignals = Metrics.GetValueOrDefault("HoldSignals", 0);

            switch (signal.Type)
            {
                case SignalType.BUY:
                    Metrics["BuySignals"] = (int)buySignals + 1;
                    break;
                case SignalType.SELL:
                    Metrics["SellSignals"] = (int)sellSignals + 1;
                    break;
                case SignalType.HOLD:
                    Metrics["HoldSignals"] = (int)holdSignals + 1;
                    break;
            }

            // Update average confidence
            var totalConfidence = Metrics.GetValueOrDefault("TotalConfidence", 0.0m);
            Metrics["TotalConfidence"] = (decimal)totalConfidence + signal.Confidence;
            Metrics["AverageConfidence"] = (decimal)Metrics["TotalConfidence"] / (int)Metrics["SignalCount"];
        }
    }
}

