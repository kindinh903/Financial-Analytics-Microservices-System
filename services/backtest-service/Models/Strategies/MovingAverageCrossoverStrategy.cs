namespace BacktestService.Models
{
    public class MovingAverageCrossoverStrategy : BaseStrategy
    {
        public override string StrategyName => "MOVING_AVERAGE_CROSSOVER";
        public override bool RequiresAI => false;
        public override int MinimumDataPoints => 50;

        private int _shortPeriod;
        private int _longPeriod;
        private decimal _threshold;

        protected override void InitializeStrategy()
        {
            _shortPeriod = Parameters.GetParameter<int>("ShortPeriod", 10);
            _longPeriod = Parameters.GetParameter<int>("LongPeriod", 20);
            _threshold = Parameters.GetParameter<decimal>("Threshold", 0.001m);

            // Validate parameters
            if (_shortPeriod >= _longPeriod)
            {
                throw new ArgumentException("Short period must be less than long period");
            }

            if (_shortPeriod < 1 || _longPeriod < 1)
            {
                throw new ArgumentException("Periods must be positive integers");
            }
        }

        protected override TradingSignal GenerateStrategySignal(TradingContext context)
        {
            var shortMA = CalculateSMA(context, _shortPeriod);
            var longMA = CalculateSMA(context, _longPeriod);

            if (shortMA == 0 || longMA == 0)
            {
                return new TradingSignal
                {
                    Type = SignalType.HOLD,
                    Confidence = 0,
                    Reason = "Insufficient data for moving average calculation"
                };
            }

            var currentPrice = context.CurrentPrice;
            var shortToLongRatio = shortMA / longMA;
            var priceToShortRatio = currentPrice / shortMA;

            // Calculate signal strength
            var signalStrength = Math.Abs(shortToLongRatio - 1.0m);
            var confidence = Math.Min(signalStrength * 10, 1.0m);

            // Generate signal based on crossover
            if (shortMA > longMA && priceToShortRatio > (1.0m + _threshold))
            {
                return new TradingSignal
                {
                    Type = SignalType.BUY,
                    Confidence = confidence,
                    Reason = $"Golden cross: Short MA ({shortMA:F2}) > Long MA ({longMA:F2})",
                    Metadata = new Dictionary<string, object>
                    {
                        ["ShortMA"] = shortMA,
                        ["LongMA"] = longMA,
                        ["Ratio"] = shortToLongRatio
                    }
                };
            }
            else if (shortMA < longMA && priceToShortRatio < (1.0m - _threshold))
            {
                return new TradingSignal
                {
                    Type = SignalType.SELL,
                    Confidence = confidence,
                    Reason = $"Death cross: Short MA ({shortMA:F2}) < Long MA ({longMA:F2})",
                    Metadata = new Dictionary<string, object>
                    {
                        ["ShortMA"] = shortMA,
                        ["LongMA"] = longMA,
                        ["Ratio"] = shortToLongRatio
                    }
                };
            }

            return new TradingSignal
            {
                Type = SignalType.HOLD,
                Confidence = 0.1m,
                Reason = "No clear crossover signal"
            };
        }

        protected override void ResetStrategy()
        {
            _shortPeriod = 0;
            _longPeriod = 0;
            _threshold = 0;
        }

        private decimal CalculateSMA(TradingContext context, int period)
        {
            if (context.HistoricalData.Count < period)
                return 0;

            var prices = context.HistoricalData.TakeLast(period).Select(c => c.Close);
            return prices.Average();
        }
    }
}

