namespace BacktestService.Models
{
    public class AIPredictionStrategy : BaseStrategy
    {
        public override string StrategyName => "AI_PREDICTION";
        public override bool RequiresAI => true;
        public override int MinimumDataPoints => 100;

        private decimal _confidenceThreshold;
        private decimal _predictionThreshold;
        private bool _useTrendDirection;

        protected override void InitializeStrategy()
        {
            _confidenceThreshold = Parameters.GetParameter<decimal>("ConfidenceThreshold", 0.6m);
            _predictionThreshold = Parameters.GetParameter<decimal>("PredictionThreshold", 0.02m);
            _useTrendDirection = Parameters.GetParameter<bool>("UseTrendDirection", true);

            // Validate parameters
            if (_confidenceThreshold < 0 || _confidenceThreshold > 1)
            {
                throw new ArgumentException("Confidence threshold must be between 0 and 1");
            }

            if (_predictionThreshold < 0)
            {
                throw new ArgumentException("Prediction threshold must be positive");
            }
        }

        protected override TradingSignal GenerateStrategySignal(TradingContext context)
        {
            if (context.AiPrediction == null)
            {
                return new TradingSignal
                {
                    Type = SignalType.HOLD,
                    Confidence = 0,
                    Reason = "No AI prediction available"
                };
            }

            var prediction = context.AiPrediction;
            var currentPrice = context.CurrentPrice;

            // Check if AI confidence is sufficient
            if (prediction.Confidence < _confidenceThreshold)
            {
                return new TradingSignal
                {
                    Type = SignalType.HOLD,
                    Confidence = prediction.Confidence,
                    Reason = $"AI confidence ({prediction.Confidence:F2}) below threshold ({_confidenceThreshold})"
                };
            }

            // Calculate expected price change
            var expectedChange = prediction.PredictedNextClose - currentPrice;
            var changePercent = Math.Abs(expectedChange / currentPrice);

            // Check if predicted change is significant enough
            if (changePercent < _predictionThreshold)
            {
                return new TradingSignal
                {
                    Type = SignalType.HOLD,
                    Confidence = prediction.Confidence,
                    Reason = $"Predicted change ({changePercent:F2}) below threshold ({_predictionThreshold})"
                };
            }

            // Generate signal based on AI prediction
            SignalType signalType;
            string reason;

            if (_useTrendDirection)
            {
                // Use trend direction from AI
                signalType = prediction.Trend.ToUpper() == "UP" ? SignalType.BUY : SignalType.SELL;
                reason = $"AI trend prediction: {prediction.Trend}";
            }
            else
            {
                // Use price prediction directly
                signalType = expectedChange > 0 ? SignalType.BUY : SignalType.SELL;
                reason = $"AI price prediction: {prediction.PredictedNextClose:F2} vs {currentPrice:F2}";
            }

            return new TradingSignal
            {
                Type = signalType,
                Confidence = prediction.Confidence,
                Reason = reason,
                Metadata = new Dictionary<string, object>
                {
                    ["PredictedPrice"] = prediction.PredictedNextClose,
                    ["ExpectedChange"] = expectedChange,
                    ["ChangePercent"] = changePercent,
                    ["Trend"] = prediction.Trend,
                    ["LastClose"] = prediction.LastClose
                }
            };
        }

        protected override void ResetStrategy()
        {
            _confidenceThreshold = 0;
            _predictionThreshold = 0;
            _useTrendDirection = false;
        }
    }
}

