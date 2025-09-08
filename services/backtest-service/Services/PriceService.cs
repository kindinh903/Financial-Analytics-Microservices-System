using System.Text.Json;
using BacktestService.Models;

namespace BacktestService.Services
{
    public class PriceService : IPriceService
    {
        private readonly HttpClient _httpClient;
        private readonly ILogger<PriceService> _logger;
        private readonly JsonSerializerOptions _jsonOptions;

        public PriceService(HttpClient httpClient, ILogger<PriceService> logger)
        {
            _httpClient = httpClient;
            _logger = logger;
            _jsonOptions = new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true,
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase
            };
        }

        public async Task<List<CandleData>> GetHistoricalDataAsync(string symbol, string interval, DateTime startTime, DateTime endTime, int limit = 500)
        {
            try
            {
                var startTimeMs = ((DateTimeOffset)startTime).ToUnixTimeMilliseconds();
                var endTimeMs = ((DateTimeOffset)endTime).ToUnixTimeMilliseconds();

                var url = $"/api/price/candles?symbol={symbol}&interval={interval}&start_time={startTimeMs}&end_time={endTimeMs}&limit={limit}";

                _logger.LogInformation("Calling price service: {Url}", url);

                var response = await _httpClient.GetAsync(url);
                response.EnsureSuccessStatusCode();

                var responseContent = await response.Content.ReadAsStringAsync();
                _logger.LogInformation("Price service response: {Response}", responseContent);

                var priceDataResponse = JsonSerializer.Deserialize<PriceDataResponse>(responseContent, _jsonOptions);

                if (priceDataResponse?.Data == null)
                {
                    throw new Exception("Invalid response from price service");
                }

                return priceDataResponse.Data.OrderBy(c => c.CloseTime).ToList();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting historical data for {Symbol} {Interval}", symbol, interval);
                throw;
            }
        }
    }
}
