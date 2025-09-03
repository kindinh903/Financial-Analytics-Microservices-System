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
                var result = await _backtestService.GetBacktestResultAsync(id);
                if (result == null)
                {
                    return NotFound();
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
                var results = await _backtestService.GetBacktestResultsAsync(symbol, interval, startDate, endDate);
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
        /// Get backtest statistics summary
        /// </summary>
        [HttpGet("stats")]
        public async Task<ActionResult<object>> GetBacktestStats(
            [FromQuery] string? symbol,
            [FromQuery] string? interval)
        {
            try
            {
                var results = await _backtestService.GetBacktestResultsAsync(symbol, interval);
                
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
                    WorstPerformingBacktest = results.OrderByAscending(r => r.TotalReturnPercent).First()
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
