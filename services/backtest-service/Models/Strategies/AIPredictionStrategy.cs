namespace BacktestService.Models
{
    public class AIPredictionStrategy : BaseStrategy
    {
        public override string StrategyName => "AI_PREDICTION";
        public override bool RequiresAI => true;
        public override int MinimumDataPoints => 30;

        private decimal _confidenceThreshold;
        private decimal _predictionThreshold;
        private bool _useTrendDirection;
        private int _predictionCounter; // Counter for predictions

        protected override void InitializeStrategy()
        {
            _confidenceThreshold = Parameters.GetParameter<decimal>("ConfidenceThreshold", 0.6m);
            _predictionThreshold = Parameters.GetParameter<decimal>("PredictionThreshold", 0.02m);
            _useTrendDirection = Parameters.GetParameter<bool>("UseTrendDirection", true);
            _predictionCounter = 0; // Initialize counter

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
                Console.WriteLine("No AI prediction available");
                return new TradingSignal
                {
                    Type = SignalType.HOLD,
                    Confidence = 0,
                    Reason = "No AI prediction available"
                };
            }

            // Increment prediction counter
            _predictionCounter++;
            
            var prediction = context.AiPrediction;
            var currentPrice = context.CurrentPrice;

            Console.WriteLine($"Prediction #{_predictionCounter} - AI Prediction: {prediction.Trend}, Change%: {prediction.ChangePercent:F4}");

            // Only trade every 3rd prediction (when counter is divisible by 3)
            if (_predictionCounter % 3 != 0)
            {
                Console.WriteLine($"Skipping prediction #{_predictionCounter} (not divisible by 3)");
                return new TradingSignal
                {
                    Type = SignalType.HOLD,
                    Confidence = prediction.Confidence,
                    Reason = $"Waiting for 3rd prediction (current: {_predictionCounter})"
                };
            }

            Console.WriteLine($"Trading on prediction #{_predictionCounter} (divisible by 3)");

            // Generate signal based on AI trend prediction
            SignalType signalType = prediction.Trend.ToUpper() == "UP" ? SignalType.BUY : SignalType.SELL;
            string reason = $"AI prediction #{_predictionCounter}: {prediction.Trend} (Change: {prediction.ChangePercent:F4}%)";

            Console.WriteLine($"Generated signal: {signalType} based on trend: {prediction.Trend}");

            return new TradingSignal
            {
                Type = signalType,
                Confidence = Math.Max(0.7m, prediction.Confidence), // Set minimum confidence for trading
                Reason = reason,
                Metadata = new Dictionary<string, object>
                {
                    ["PredictionNumber"] = _predictionCounter,
                    ["PredictedPrice"] = prediction.PredictedNextClose,
                    ["ExpectedChange"] = prediction.PredictedNextClose - currentPrice,
                    ["ChangePercent"] = prediction.ChangePercent,
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
            _predictionCounter = 0; // Reset counter
        }
    }
}

