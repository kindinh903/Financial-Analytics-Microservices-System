namespace BacktestService.Models
{
    public class RSIStrategy : BaseStrategy
    {
        public override string StrategyName => "RSI";
        public override bool RequiresAI => false;
        public override int MinimumDataPoints => 30;

        private int _period;
        private decimal _oversoldThreshold;
        private decimal _overboughtThreshold;

        protected override void InitializeStrategy()
        {
            _period = Parameters.GetParameter<int>("Period", 14);
            _oversoldThreshold = Parameters.GetParameter<decimal>("OversoldThreshold", 30m);
            _overboughtThreshold = Parameters.GetParameter<decimal>("OverboughtThreshold", 70m);

            // Validate parameters
            if (_period < 2)
            {
                throw new ArgumentException("RSI period must be at least 2");
            }

            if (_oversoldThreshold >= _overboughtThreshold)
            {
                throw new ArgumentException("Oversold threshold must be less than overbought threshold");
            }
        }

        protected override TradingSignal GenerateStrategySignal(TradingContext context)
        {
            var rsi = CalculateRSI(context, _period);

            if (rsi == -1) // Invalid RSI
            {
                return new TradingSignal
                {
                    Type = SignalType.HOLD,
                    Confidence = 0,
                    Reason = "Insufficient data for RSI calculation"
                };
            }

            var confidence = CalculateRSIConfidence(rsi);

            // Generate signal based on RSI levels
            if (rsi <= _oversoldThreshold)
            {
                return new TradingSignal
                {
                    Type = SignalType.BUY,
                    Confidence = confidence,
                    Reason = $"Oversold condition: RSI ({rsi:F2}) <= {_oversoldThreshold}",
                    Metadata = new Dictionary<string, object>
                    {
                        ["RSI"] = rsi,
                        ["Period"] = _period
                    }
                };
            }
            else if (rsi >= _overboughtThreshold)
            {
                return new TradingSignal
                {
                    Type = SignalType.SELL,
                    Confidence = confidence,
                    Reason = $"Overbought condition: RSI ({rsi:F2}) >= {_overboughtThreshold}",
                    Metadata = new Dictionary<string, object>
                    {
                        ["RSI"] = rsi,
                        ["Period"] = _period
                    }
                };
            }

            return new TradingSignal
            {
                Type = SignalType.HOLD,
                Confidence = 0.1m,
                Reason = $"Neutral RSI: {rsi:F2}"
            };
        }

        protected override void ResetStrategy()
        {
            _period = 0;
            _oversoldThreshold = 0;
            _overboughtThreshold = 0;
        }

        private decimal CalculateRSI(TradingContext context, int period)
        {
            if (context.HistoricalData.Count < period + 1)
                return -1;

            var prices = context.HistoricalData.TakeLast(period + 1).Select(c => c.Close).ToList();
            var gains = new List<decimal>();
            var losses = new List<decimal>();

            for (int i = 1; i < prices.Count; i++)
            {
                var change = prices[i] - prices[i - 1];
                if (change > 0)
                {
                    gains.Add(change);
                    losses.Add(0);
                }
                else
                {
                    gains.Add(0);
                    losses.Add(Math.Abs(change));
                }
            }

            var avgGain = gains.Average();
            var avgLoss = losses.Average();

            if (avgLoss == 0)
                return 100;

            var rs = avgGain / avgLoss;
            var rsi = 100 - (100 / (1 + rs));

            return rsi;
        }

        private decimal CalculateRSIConfidence(decimal rsi)
        {
            // Higher confidence when RSI is more extreme
            if (rsi <= 20 || rsi >= 80)
                return 0.9m;
            else if (rsi <= 25 || rsi >= 75)
                return 0.7m;
            else if (rsi <= 30 || rsi >= 70)
                return 0.5m;
            else
                return 0.3m;
        }
    }
}

