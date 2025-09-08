using Microsoft.AspNetCore.Mvc;
using BacktestService.Models;
using BacktestService.Services;

namespace BacktestService.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class BacktestController : ControllerBase
    {
        private readonly IBacktestService _backtestService;
        private readonly ILogger<BacktestController> _logger;

        public BacktestController(IBacktestService backtestService, ILogger<BacktestController> logger)
        {
            _backtestService = backtestService;
            _logger = logger;
        }

        /// <summary>
        /// Run a new backtest with AI predictions
        /// </summary>
        [HttpPost]
        public async Task<ActionResult<BacktestResult>> RunBacktest([FromBody] BacktestRequest request)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                // Log all headers for debugging
                foreach (var header in Request.Headers)
                {
                    _logger.LogInformation("Header: {Key} = {Value}", header.Key, string.Join(",", header.Value));
                }

                // Extract user ID from header (set by gateway)
                var userId = Request.Headers["X-User-Id"].FirstOrDefault();
                _logger.LogInformation("Extracted UserId: {UserId}", userId ?? "NULL");
                
                // For now, allow requests without user ID for testing
                // if (string.IsNullOrEmpty(userId))
                // {
                //     return Unauthorized(new { error = "User ID not found in request" });
                // }

                // Set user ID in request (can be null for direct API calls)
                request.UserId = userId;

                var result = await _backtestService.RunBacktestAsync(request);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error running backtest for {Symbol} {Interval}", request.Symbol, request.Interval);
                return StatusCode(500, new { error = "Internal server error", message = ex.Message });
            }
        }

        /// <summary>
        /// Get a specific backtest result by ID
        /// </summary>
        [HttpGet("{id}")]
        public async Task<ActionResult<BacktestResult>> GetBacktestResult(Guid id)
        {
            try
            {
                // Extract user ID from header (set by gateway)
                var userId = Request.Headers["X-User-Id"].FirstOrDefault();
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized(new { error = "User ID not found in request" });
                }

                var result = await _backtestService.GetBacktestResultAsync(id);
                if (result == null)
                {
                    return NotFound();
                }

                // Check if the backtest belongs to the requesting user
                if (result.UserId != userId)
                {
                    return StatusCode(403, new { error = "Access denied. You can only access your own backtest results." });
                }

                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting backtest result {Id}", id);
                return StatusCode(500, new { error = "Internal server error" });
            }
        }

        /// <summary>
        /// Get all backtest results with optional filtering
        /// </summary>
        [HttpGet]
        public async Task<ActionResult<List<BacktestResult>>> GetBacktestResults(
            [FromQuery] string? symbol,
            [FromQuery] string? interval,
            [FromQuery] DateTime? startDate,
            [FromQuery] DateTime? endDate)
        {
            try
            {
                // Extract user ID from header (set by gateway)
                var userId = Request.Headers["X-User-Id"].FirstOrDefault();
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized(new { error = "User ID not found in request" });
                }

                // Filter results by user ID
                var results = await _backtestService.GetBacktestResultsAsync(symbol, interval, startDate, endDate, userId);
                return Ok(results);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting backtest results");
                return StatusCode(500, new { error = "Internal server error" });
            }
        }

        /// <summary>
        /// Delete a backtest result
        /// </summary>
        [HttpDelete("{id}")]
        public async Task<ActionResult> DeleteBacktestResult(Guid id)
        {
            try
            {
                // Extract user ID from header (set by gateway)
                var userId = Request.Headers["X-User-Id"].FirstOrDefault();
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized(new { error = "User ID not found in request" });
                }

                // Get the backtest result to check ownership
                var result = await _backtestService.GetBacktestResultAsync(id);
                if (result == null)
                {
                    return NotFound();
                }

                // Check if the backtest belongs to the requesting user
                if (result.UserId != userId)
                {
                    return StatusCode(403, new { error = "Access denied. You can only delete your own backtest results." });
                }

                await _backtestService.DeleteBacktestResultAsync(id);
                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting backtest result {Id}", id);
                return StatusCode(500, new { error = "Internal server error" });
            }
        }

        /// <summary>
        /// Get available trading strategies
        /// </summary>
        [HttpGet("strategies")]
        public ActionResult<List<StrategyInfo>> GetAvailableStrategies()
        {
            try
            {
                var strategies = StrategyFactory.GetAvailableStrategies();
                return Ok(strategies);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting available strategies");
                return StatusCode(500, new { error = "Internal server error" });
            }
        }

        /// <summary>
        /// Get strategy information by name
        /// </summary>
        [HttpGet("strategies/{strategyName}")]
        public ActionResult<StrategyInfo> GetStrategyInfo(string strategyName)
        {
            try
            {
                var strategyInfo = StrategyFactory.GetStrategyInfo(strategyName);
                if (strategyInfo == null)
                {
                    return NotFound(new { error = $"Strategy '{strategyName}' not found" });
                }

                return Ok(strategyInfo);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting strategy info for {StrategyName}", strategyName);
                return StatusCode(500, new { error = "Internal server error" });
            }
        }

        /// <summary>
        /// Get backtest statistics summary
        /// </summary>
        [HttpGet("stats")]
        public async Task<ActionResult<object>> GetBacktestStats(
            [FromQuery] string? symbol,
            [FromQuery] string? interval)
        {
            try
            {
                // Extract user ID from header (set by gateway)
                var userId = Request.Headers["X-User-Id"].FirstOrDefault();
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized(new { error = "User ID not found in request" });
                }

                // Filter results by user ID
                var results = await _backtestService.GetBacktestResultsAsync(symbol, interval, null, null, userId);
                
                if (!results.Any())
                {
                    return Ok(new { message = "No backtest results found" });
                }

                var stats = new
                {
                    TotalBacktests = results.Count,
                    AverageReturn = results.Average(r => r.TotalReturnPercent),
                    AverageWinRate = results.Average(r => r.WinRate),
                    AverageAccuracy = results.Average(r => r.Accuracy),
                    AverageSharpeRatio = results.Average(r => r.SharpeRatio),
                    AverageMaxDrawdown = results.Average(r => r.MaxDrawdown),
                    BestPerformingBacktest = results.OrderByDescending(r => r.TotalReturnPercent).First(),
                    WorstPerformingBacktest = results.OrderBy(r => r.TotalReturnPercent).First()
                };

                return Ok(stats);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting backtest statistics");
                return StatusCode(500, new { error = "Internal server error" });
            }
        }
    }
}
