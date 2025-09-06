using BacktestService.Data;
using BacktestService.Models;
using Microsoft.EntityFrameworkCore;

namespace BacktestService.Services
{
    public class BacktestService : IBacktestService
    {
        private readonly BacktestDbContext _context;
        private readonly StrategyBacktestEngine _strategyEngine;
        private readonly ILogger<BacktestService> _logger;

        public BacktestService(
            BacktestDbContext context,
            StrategyBacktestEngine strategyEngine,
            ILogger<BacktestService> logger)
        {
            _context = context;
            _strategyEngine = strategyEngine;
            _logger = logger;
        }

        public async Task<BacktestResult> RunBacktestAsync(BacktestRequest request)
        {
            _logger.LogInformation("Starting backtest for {Symbol} {Interval} with strategy {Strategy}", 
                request.Symbol, request.Interval, request.Strategy);

            // Validate strategy
            if (!StrategyFactory.IsStrategyRegistered(request.Strategy))
            {
                throw new ArgumentException($"Strategy '{request.Strategy}' is not registered");
            }

            // Run backtest using strategy engine
            var result = await _strategyEngine.RunBacktestAsync(request);

            // Save result to database
            _context.BacktestResults.Add(result);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Completed backtest {Id} with final balance {FinalBalance}", 
                result.Id, result.FinalBalance);

            return result;
        }

        public async Task<BacktestResult?> GetBacktestResultAsync(Guid id)
        {
            return await _context.BacktestResults
                .Include(r => r.Trades)
                .Include(r => r.PerformanceHistory)
                .FirstOrDefaultAsync(r => r.Id == id);
        }

        public async Task<List<BacktestResult>> GetBacktestResultsAsync(
            string? symbol = null, 
            string? interval = null, 
            DateTime? startDate = null, 
            DateTime? endDate = null)
        {
            var query = _context.BacktestResults
                .Include(r => r.Trades)
                .Include(r => r.PerformanceHistory)
                .AsQueryable();

            if (!string.IsNullOrEmpty(symbol))
            {
                query = query.Where(r => r.Symbol == symbol);
            }

            if (!string.IsNullOrEmpty(interval))
            {
                query = query.Where(r => r.Interval == interval);
            }

            if (startDate.HasValue)
            {
                query = query.Where(r => r.StartDate >= startDate.Value);
            }

            if (endDate.HasValue)
            {
                query = query.Where(r => r.EndDate <= endDate.Value);
            }

            return await query.OrderByDescending(r => r.CreatedAt).ToListAsync();
        }

        public async Task DeleteBacktestResultAsync(Guid id)
        {
            var result = await _context.BacktestResults.FindAsync(id);
            if (result != null)
            {
                _context.BacktestResults.Remove(result);
                await _context.SaveChangesAsync();
            }
        }
    }
}

