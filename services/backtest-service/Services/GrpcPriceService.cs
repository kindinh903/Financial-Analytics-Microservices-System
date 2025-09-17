using BacktestService.Models;
using BacktestService.Grpc;
using Grpc.Net.Client;

namespace BacktestService.Services
{
    public class GrpcPriceService : IPriceService, IDisposable
    {
        private readonly ILogger<GrpcPriceService> _logger;
        private readonly GrpcChannel _channel;
        private readonly Grpc.PriceService.PriceServiceClient _client;

        public GrpcPriceService(IConfiguration configuration, ILogger<GrpcPriceService> logger)
        {
            _logger = logger;
            var endpoint = configuration["Services:PriceService:GrpcEndpoint"] ?? "http://price-service:9090";
            _channel = GrpcChannel.ForAddress(endpoint);
            _client = new Grpc.PriceService.PriceServiceClient(_channel);
        }

        public async Task<List<Models.CandleData>> GetHistoricalDataAsync(string symbol, string interval, DateTime startTime, DateTime endTime, int limit = 500)
        {
            var request = new GetHistoricalDataRequest
            {
                Symbol = symbol,
                Interval = interval,
                StartTimeMs = new DateTimeOffset(startTime).ToUnixTimeMilliseconds(),
                EndTimeMs = new DateTimeOffset(endTime).ToUnixTimeMilliseconds(),
                Limit = limit
            };

            _logger.LogInformation("gRPC calling price service {Symbol} {Interval}", symbol, interval);

            var response = await _client.GetHistoricalDataAsync(request).ResponseAsync;

            var candles = response.Candles.Select(c => new Models.CandleData
            {
                OpenTime = c.OpenTime,
                Open = (decimal)c.Open,
                High = (decimal)c.High,
                Low = (decimal)c.Low,
                Close = (decimal)c.Close,
                Volume = (decimal)c.Volume,
                CloseTime = c.CloseTime
            }).OrderBy(c => c.CloseTime).ToList();

            return candles;
        }

        public void Dispose()
        {
            _channel.Dispose();
        }
    }
}


