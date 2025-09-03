using System.Text;
using System.Text.Json;
using BacktestService.Models;

namespace BacktestService.Services
{
    public class AiService : IAiService
    {
        private readonly HttpClient _httpClient;
        private readonly ILogger<AiService> _logger;

        public AiService(HttpClient httpClient, ILogger<AiService> logger)
        {
            _httpClient = httpClient;
            _logger = logger;
        }

        public async Task<AiPrediction> GetPredictionAsync(string symbol, string interval, List<CandleData> historicalData)
        {
            try
            {
                var requestData = new
                {
                    data = historicalData.Select(c => new
                    {
                        symbol = symbol,
                        interval = interval,
                        open = c.Open,
                        high = c.High,
                        low = c.Low,
                        close = c.Close,
                        volume = c.Volume,
                        close_time = c.CloseTime
                    }).ToList()
                };

                var json = JsonSerializer.Serialize(requestData);
                var content = new StringContent(json, Encoding.UTF8, "application/json");

                var response = await _httpClient.PostAsync("/predict", content);
                response.EnsureSuccessStatusCode();

                var responseContent = await response.Content.ReadAsStringAsync();
                var predictionResponse = JsonSerializer.Deserialize<AiPredictionResponse>(responseContent);

                if (predictionResponse?.Result == null)
                {
                    throw new Exception("Invalid response from AI service");
                }

                return new AiPrediction
                {
                    Symbol = predictionResponse.Result.Symbol,
                    Interval = predictionResponse.Result.Interval,
                    LastClose = predictionResponse.Result.LastClose,
                    PredictedNextClose = predictionResponse.Result.PredictedNextClose,
                    Trend = predictionResponse.Result.Trend,
                    ChangePercent = predictionResponse.Result.ChangePercent,
                    Confidence = Math.Abs(predictionResponse.Result.ChangePercent) / 100m
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting AI prediction for {Symbol} {Interval}", symbol, interval);
                throw;
            }
        }

        private class AiPredictionResponse
        {
            public string Status { get; set; } = string.Empty;
            public AiPredictionResult? Result { get; set; }
        }

        private class AiPredictionResult
        {
            public string Symbol { get; set; } = string.Empty;
            public string Interval { get; set; } = string.Empty;
            public decimal LastClose { get; set; }
            public decimal PredictedNextClose { get; set; }
            public string Trend { get; set; } = string.Empty;
            public decimal ChangePercent { get; set; }
        }
    }
}
