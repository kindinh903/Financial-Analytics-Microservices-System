using BacktestService.Models;

namespace BacktestService.Services
{
    public class MockPriceService : IPriceService
    {
        private readonly Random _random = new Random();

        public Task<List<CandleData>> GetHistoricalDataAsync(string symbol, string interval, DateTime startTime, DateTime endTime, int limit = 500)
        {
            var data = new List<CandleData>();
            var currentTime = startTime;
            var basePrice = GetBasePrice(symbol);
            var currentPrice = basePrice;

            // Generate mock candle data
            while (currentTime <= endTime && data.Count < limit)
            {
                // Generate price movement with some randomness
                var priceChange = (decimal)(_random.NextDouble() * 0.02 - 0.01); // -1% to +1%
                var newPrice = currentPrice * (1 + priceChange);

                // Generate OHLC data
                var open = currentPrice;
                var close = newPrice;
                var high = Math.Max(open, close) * (1 + (decimal)(_random.NextDouble() * 0.005)); // Up to 0.5% higher
                var low = Math.Min(open, close) * (1 - (decimal)(_random.NextDouble() * 0.005)); // Up to 0.5% lower
                var volume = (decimal)(_random.NextDouble() * 1000000 + 100000); // 100k to 1.1M

                var candle = new CandleData
                {
                    OpenTime = ((DateTimeOffset)currentTime).ToUnixTimeMilliseconds(),
                    Open = open,
                    High = high,
                    Low = low,
                    Close = close,
                    Volume = volume,
                    CloseTime = ((DateTimeOffset)currentTime.AddMinutes(GetIntervalMinutes(interval))).ToUnixTimeMilliseconds()
                };

                data.Add(candle);
                currentPrice = close;
                currentTime = currentTime.AddMinutes(GetIntervalMinutes(interval));
            }

            return Task.FromResult(data);
        }

        private decimal GetBasePrice(string symbol)
        {
            // Base prices for different symbols
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

        private int GetIntervalMinutes(string interval)
        {
            return interval.ToUpper() switch
            {
                "1m" => 1,
                "5m" => 5,
                "15m" => 15,
                "30m" => 30,
                "1h" => 60,
                "2h" => 120,
                "4h" => 240,
                "6h" => 360,
                "8h" => 480,
                "12h" => 720,
                "1d" => 1440,
                "3d" => 4320,
                "1w" => 10080,
                "1mon" => 43200,
                _ => 60
            };
        }
    }
}
