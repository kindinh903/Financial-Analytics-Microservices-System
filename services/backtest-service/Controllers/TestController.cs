using Microsoft.AspNetCore.Mvc;
using BacktestService.Models;
using BacktestService.Services;
using BacktestService.MockData;

namespace BacktestService.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class TestController : ControllerBase
    {
        private readonly IBacktestService _backtestService;
        private readonly ILogger<TestController> _logger;

        public TestController(IBacktestService backtestService, ILogger<TestController> logger)
        {
            _backtestService = backtestService;
            _logger = logger;
        }

        /// <summary>
        /// Test all available strategies with mock data
        /// </summary>
        [HttpPost("strategies/all")]
        public async Task<ActionResult<List<BacktestResult>>> TestAllStrategies()
        {
            try
            {
                var testRequests = MockTestData.GetTestBacktestRequests();
                var results = new List<BacktestResult>();

                foreach (var request in testRequests)
                {
                    _logger.LogInformation("Testing strategy: {Strategy} for {Symbol}", 
                        request.Strategy, request.Symbol);
                    
                    var result = await _backtestService.RunBacktestAsync(request);
                    results.Add(result);
                }

                return Ok(results);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error testing all strategies");
                return StatusCode(500, new { error = "Internal server error", message = ex.Message });
            }
        }

        /// <summary>
        /// Test a specific strategy with custom parameters
        /// </summary>
        [HttpPost("strategy/{strategyName}")]
        public async Task<ActionResult<BacktestResult>> TestStrategy(
            string strategyName, 
            [FromBody] BacktestRequest? customRequest = null)
        {
            try
            {
                // Use custom request or create default one
                var request = customRequest ?? new BacktestRequest
                {
                    Symbol = "BTCUSDT",
                    Interval = "1h",
                    StartDate = DateTime.UtcNow.AddDays(-30),
                    EndDate = DateTime.UtcNow.AddDays(-1),
                    InitialBalance = 10000,
                    Commission = 0.001m,
                    Strategy = strategyName,
                    MaxDrawdown = 0.1m,
                    StopLoss = 0.05m,
                    TakeProfit = 0.1m
                };

                // Override strategy name
                request.Strategy = strategyName;

                _logger.LogInformation("Testing strategy: {Strategy} for {Symbol}", 
                    request.Strategy, request.Symbol);

                var result = await _backtestService.RunBacktestAsync(request);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error testing strategy {StrategyName}", strategyName);
                return StatusCode(500, new { error = "Internal server error", message = ex.Message });
            }
        }

        /// <summary>
        /// Test strategy factory functionality
        /// </summary>
        [HttpGet("factory")]
        public ActionResult<object> TestStrategyFactory()
        {
            try
            {
                var strategies = StrategyFactory.GetAvailableStrategies();
                var strategyNames = StrategyFactory.GetStrategyNames();

                return Ok(new
                {
                    AvailableStrategies = strategies,
                    StrategyNames = strategyNames,
                    TotalStrategies = strategies.Count
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error testing strategy factory");
                return StatusCode(500, new { error = "Internal server error", message = ex.Message });
            }
        }

        /// <summary>
        /// Test individual strategy creation and signal generation
        /// </summary>
        [HttpPost("strategy/{strategyName}/signal")]
        public ActionResult<object> TestStrategySignal(string strategyName)
        {
            try
            {
                // Create strategy
                var strategy = StrategyFactory.CreateStrategy(strategyName);
                
                // Create test parameters
                var parameters = new StrategyParameters();
                var strategyInfo = StrategyFactory.GetStrategyInfo(strategyName);
                
                if (strategyInfo != null)
                {
                    foreach (var param in strategyInfo.DefaultParameters)
                    {
                        parameters.SetParameter(param.Key, param.Value);
                    }
                }

                strategy.Initialize(parameters);

                // Create test context
                var testData = MockTestData.GetSampleCandleData("BTCUSDT", 100);
                var context = new TradingContext(testData.Last(), testData);

                // Generate signal
                var signal = strategy.GenerateSignal(context);

                return Ok(new
                {
                    StrategyName = strategyName,
                    Signal = signal,
                    Metrics = strategy.GetMetrics(),
                    ContextData = new
                    {
                        DataPoints = testData.Count,
                        CurrentPrice = context.CurrentPrice,
                        HasEnoughData = context.HasEnoughData(strategy.MinimumDataPoints)
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error testing strategy signal for {StrategyName}", strategyName);
                return StatusCode(500, new { error = "Internal server error", message = ex.Message });
            }
        }

        /// <summary>
        /// Get sample candle data for testing
        /// </summary>
        [HttpGet("data/{symbol}/{count}")]
        public ActionResult<List<CandleData>> GetSampleData(string symbol = "BTCUSDT", int count = 100)
        {
            try
            {
                var data = MockTestData.GetSampleCandleData(symbol, count);
                return Ok(data);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting sample data for {Symbol}", symbol);
                return StatusCode(500, new { error = "Internal server error", message = ex.Message });
            }
        }
    }
}
