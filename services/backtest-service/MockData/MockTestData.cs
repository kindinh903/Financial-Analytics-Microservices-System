using BacktestService.Models;

namespace BacktestService.MockData
{
    public static class MockTestData
    {
        public static List<BacktestRequest> GetTestBacktestRequests()
        {
            return new List<BacktestRequest>
            {
                // Moving Average Crossover Test
                new BacktestRequest
                {
                    Symbol = "BTCUSDT",
                    Interval = "1h",
                    StartDate = DateTime.UtcNow.AddDays(-30),
                    EndDate = DateTime.UtcNow.AddDays(-1),
                    InitialBalance = 10000,
                    Commission = 0.001m,
                    Strategy = "MOVING_AVERAGE_CROSSOVER",
                    Parameters = new Dictionary<string, object>
                    {
                        ["ShortPeriod"] = 10,
                        ["LongPeriod"] = 20,
                        ["Threshold"] = 0.001m
                    },
                    MaxDrawdown = 0.1m,
                    StopLoss = 0.05m,
                    TakeProfit = 0.1m
                },

                // RSI Strategy Test
                new BacktestRequest
                {
                    Symbol = "ETHUSDT",
                    Interval = "4h",
                    StartDate = DateTime.UtcNow.AddDays(-30),
                    EndDate = DateTime.UtcNow.AddDays(-1),
                    InitialBalance = 10000,
                    Commission = 0.001m,
                    Strategy = "RSI",
                    Parameters = new Dictionary<string, object>
                    {
                        ["Period"] = 14,
                        ["OversoldThreshold"] = 30m,
                        ["OverboughtThreshold"] = 70m
                    },
                    MaxDrawdown = 0.1m,
                    StopLoss = 0.05m,
                    TakeProfit = 0.1m
                },

                // AI Prediction Strategy Test
                new BacktestRequest
                {
                    Symbol = "ADAUSDT",
                    Interval = "1d",
                    StartDate = DateTime.UtcNow.AddDays(-30),
                    EndDate = DateTime.UtcNow.AddDays(-1),
                    InitialBalance = 10000,
                    Commission = 0.001m,
                    Strategy = "AI_PREDICTION",
                    Parameters = new Dictionary<string, object>
                    {
                        ["ConfidenceThreshold"] = 0.6m,
                        ["PredictionThreshold"] = 0.02m,
                        ["UseTrendDirection"] = true
                    },
                    MaxDrawdown = 0.1m,
                    StopLoss = 0.05m,
                    TakeProfit = 0.1m
                }
            };
        }

        public static List<CandleData> GetSampleCandleData(string symbol = "BTCUSDT", int count = 100)
        {
            var random = new Random();
            var data = new List<CandleData>();
            var basePrice = GetBasePrice(symbol);
            var currentPrice = basePrice;
            var currentTime = DateTime.UtcNow.AddDays(-count);

            for (int i = 0; i < count; i++)
            {
                var priceChange = (decimal)(random.NextDouble() * 0.02 - 0.01); // -1% to +1%
                var newPrice = currentPrice * (1 + priceChange);

                var open = currentPrice;
                var close = newPrice;
                var high = Math.Max(open, close) * (1 + (decimal)(random.NextDouble() * 0.005));
                var low = Math.Min(open, close) * (1 - (decimal)(random.NextDouble() * 0.005));
                var volume = (decimal)(random.NextDouble() * 1000000 + 100000);

                var candle = new CandleData
                {
                    OpenTime = ((DateTimeOffset)currentTime).ToUnixTimeMilliseconds(),
                    Open = open,
                    High = high,
                    Low = low,
                    Close = close,
                    Volume = volume,
                    CloseTime = ((DateTimeOffset)currentTime.AddHours(1)).ToUnixTimeMilliseconds()
                };

                data.Add(candle);
                currentPrice = close;
                currentTime = currentTime.AddHours(1);
            }

            return data;
        }

        private static decimal GetBasePrice(string symbol)
        {
            return symbol.ToUpper() switch
            {
                "BTCUSDT" => 50000m,
                "ETHUSDT" => 3000m,
                "ADAUSDT" => 0.5m,
                "BNBUSDT" => 300m,
                "DOGEUSDT" => 0.08m,
                "DOTUSDT" => 6m,
                "LTCUSDT" => 100m,
                _ => 100m
            };
        }
    }
}
