using Microsoft.EntityFrameworkCore;
using BacktestService.Models;

namespace BacktestService.Data
{
    public class BacktestDbContext : DbContext
    {
        public BacktestDbContext(DbContextOptions<BacktestDbContext> options) : base(options)
        {
        }

        public DbSet<BacktestResult> BacktestResults { get; set; }
        public DbSet<Trade> Trades { get; set; }
        public DbSet<PerformancePoint> PerformancePoints { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Configure BacktestResult
            modelBuilder.Entity<BacktestResult>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.UserId).IsRequired().HasMaxLength(450);
                entity.Property(e => e.Symbol).IsRequired().HasMaxLength(20);
                entity.Property(e => e.Interval).IsRequired().HasMaxLength(10);
                entity.Property(e => e.InitialBalance).HasColumnType("decimal(18,8)");
                entity.Property(e => e.FinalBalance).HasColumnType("decimal(18,8)");
                entity.Property(e => e.TotalReturn).HasColumnType("decimal(18,8)");
                entity.Property(e => e.TotalReturnPercent).HasColumnType("decimal(18,8)");
                entity.Property(e => e.WinRate).HasColumnType("decimal(18,8)");
                entity.Property(e => e.MaxDrawdown).HasColumnType("decimal(18,8)");
                entity.Property(e => e.SharpeRatio).HasColumnType("decimal(18,8)");
                entity.Property(e => e.Accuracy).HasColumnType("decimal(18,8)");
                entity.Property(e => e.Precision).HasColumnType("decimal(18,8)");
                entity.Property(e => e.Recall).HasColumnType("decimal(18,8)");
                entity.Property(e => e.F1Score).HasColumnType("decimal(18,8)");
                entity.Property(e => e.CreatedAt).HasDefaultValueSql("GETUTCDATE()");
            });

            // Configure Trade
            modelBuilder.Entity<Trade>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Type).IsRequired().HasMaxLength(10);
                entity.Property(e => e.Price).HasColumnType("decimal(18,8)");
                entity.Property(e => e.Quantity).HasColumnType("decimal(18,8)");
                entity.Property(e => e.Commission).HasColumnType("decimal(18,8)");
                entity.Property(e => e.PnL).HasColumnType("decimal(18,8)");
                entity.Property(e => e.Reason).IsRequired().HasMaxLength(200);
                entity.HasOne<BacktestResult>()
                    .WithMany(b => b.Trades)
                    .HasForeignKey(t => t.BacktestResultId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            // Configure PerformancePoint
            modelBuilder.Entity<PerformancePoint>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Balance).HasColumnType("decimal(18,8)");
                entity.Property(e => e.Equity).HasColumnType("decimal(18,8)");
                entity.Property(e => e.Drawdown).HasColumnType("decimal(18,8)");
                entity.HasOne<BacktestResult>()
                    .WithMany(b => b.PerformanceHistory)
                    .HasForeignKey(p => p.BacktestResultId)
                    .OnDelete(DeleteBehavior.Cascade);
            });
        }
    }
}
