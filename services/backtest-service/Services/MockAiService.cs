using BacktestService.Models;

namespace BacktestService.Services
{
    public class MockAiService : IAiService
    {
        private readonly Random _random = new Random();
        private readonly List<string> _trends = new() { "UP", "DOWN" };

        public Task<AiPrediction> GetPredictionAsync(string symbol, string interval, List<CandleData> historicalData)
        {
            // Mock AI prediction logic
            var lastCandle = historicalData.LastOrDefault();
            if (lastCandle == null)
            {
                throw new ArgumentException("No historical data provided");
            }

            // Generate mock prediction based on recent price movement
            var recentPrices = historicalData.TakeLast(5).Select(c => c.Close).ToList();
            var priceChange = recentPrices.Count > 1 ? 
                (recentPrices.Last() - recentPrices.First()) / recentPrices.First() : 0;

            // Determine trend based on recent movement
            var trend = priceChange > 0.01m ? "UP" : priceChange < -0.01m ? "DOWN" : 
                       _trends[_random.Next(_trends.Count)];

            // Generate predicted price with some randomness
            var priceVariation = (decimal)(_random.NextDouble() * 0.1 - 0.05); // -5% to +5%
            var predictedPrice = lastCandle.Close * (1 + priceVariation);

            // Generate confidence based on trend consistency
            var confidence = Math.Max(0.3m, Math.Min(0.95m, 0.5m + Math.Abs(priceChange) * 10));

            var prediction = new AiPrediction
            {
                Symbol = symbol,
                Interval = interval,
                LastClose = lastCandle.Close,
                PredictedNextClose = predictedPrice,
                Trend = trend,
                ChangePercent = (predictedPrice - lastCandle.Close) / lastCandle.Close * 100,
                Confidence = confidence
            };

            return Task.FromResult(prediction);
        }
    }
}
