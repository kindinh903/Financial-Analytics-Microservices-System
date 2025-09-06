namespace BacktestService.Models
{
    public class TradingContext
    {
        public CandleData CurrentCandle { get; set; } = new();
        public List<CandleData> HistoricalData { get; set; } = new();
        public AiPrediction? AiPrediction { get; set; }
        public decimal CurrentBalance { get; set; }
        public decimal CurrentPosition { get; set; }
        public decimal CurrentPrice { get; set; }
        public DateTime CurrentTime { get; set; }
        public List<Trade> CompletedTrades { get; set; } = new();
        public List<PerformancePoint> PerformanceHistory { get; set; } = new();

        public TradingContext()
        {
        }

        public TradingContext(CandleData currentCandle, List<CandleData> historicalData)
        {
            CurrentCandle = currentCandle;
            HistoricalData = historicalData;
            CurrentPrice = currentCandle.Close;
            CurrentTime = DateTimeOffset.FromUnixTimeMilliseconds(currentCandle.CloseTime).DateTime;
        }

        public CandleData? GetCandleAt(int index)
        {
            if (index >= 0 && index < HistoricalData.Count)
            {
                return HistoricalData[index];
            }
            return null;
        }

        public List<CandleData> GetLastNCandles(int n)
        {
            return HistoricalData.TakeLast(n).ToList();
        }

        public decimal GetPriceAt(int index)
        {
            var candle = GetCandleAt(index);
            return candle?.Close ?? 0;
        }

        public decimal GetHighAt(int index)
        {
            var candle = GetCandleAt(index);
            return candle?.High ?? 0;
        }

        public decimal GetLowAt(int index)
        {
            var candle = GetCandleAt(index);
            return candle?.Low ?? 0;
        }

        public decimal GetVolumeAt(int index)
        {
            var candle = GetCandleAt(index);
            return candle?.Volume ?? 0;
        }

        public bool HasEnoughData(int requiredPoints)
        {
            return HistoricalData.Count >= requiredPoints;
        }

        public void AddTrade(Trade trade)
        {
            CompletedTrades.Add(trade);
        }

        public void AddPerformancePoint(PerformancePoint point)
        {
            PerformanceHistory.Add(point);
        }

        public decimal GetTotalPnL()
        {
            return CompletedTrades.Sum(t => t.PnL);
        }

        public int GetTotalTrades()
        {
            return CompletedTrades.Count;
        }

        public int GetWinningTrades()
        {
            return CompletedTrades.Count(t => t.PnL > 0);
        }

        public int GetLosingTrades()
        {
            return CompletedTrades.Count(t => t.PnL < 0);
        }
    }
}

