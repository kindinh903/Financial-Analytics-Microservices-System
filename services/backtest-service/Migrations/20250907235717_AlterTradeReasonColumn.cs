using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BacktestService.Migrations
{
    /// <inheritdoc />
    public partial class AlterTradeReasonColumn : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "BacktestResults",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Symbol = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    Interval = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false),
                    StartDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    EndDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    InitialBalance = table.Column<decimal>(type: "decimal(18,8)", nullable: false),
                    FinalBalance = table.Column<decimal>(type: "decimal(18,8)", nullable: false),
                    TotalReturn = table.Column<decimal>(type: "decimal(18,8)", nullable: false),
                    TotalReturnPercent = table.Column<decimal>(type: "decimal(18,8)", nullable: false),
                    TotalTrades = table.Column<int>(type: "int", nullable: false),
                    WinningTrades = table.Column<int>(type: "int", nullable: false),
                    LosingTrades = table.Column<int>(type: "int", nullable: false),
                    WinRate = table.Column<decimal>(type: "decimal(18,8)", nullable: false),
                    MaxDrawdown = table.Column<decimal>(type: "decimal(18,8)", nullable: false),
                    SharpeRatio = table.Column<decimal>(type: "decimal(18,8)", nullable: false),
                    Accuracy = table.Column<decimal>(type: "decimal(18,8)", nullable: false),
                    Precision = table.Column<decimal>(type: "decimal(18,8)", nullable: false),
                    Recall = table.Column<decimal>(type: "decimal(18,8)", nullable: false),
                    F1Score = table.Column<decimal>(type: "decimal(18,8)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETUTCDATE()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BacktestResults", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "PerformancePoints",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    BacktestResultId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Timestamp = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Balance = table.Column<decimal>(type: "decimal(18,8)", nullable: false),
                    Equity = table.Column<decimal>(type: "decimal(18,8)", nullable: false),
                    Drawdown = table.Column<decimal>(type: "decimal(18,8)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PerformancePoints", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PerformancePoints_BacktestResults_BacktestResultId",
                        column: x => x.BacktestResultId,
                        principalTable: "BacktestResults",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Trades",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    BacktestResultId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Timestamp = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Type = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false),
                    Price = table.Column<decimal>(type: "decimal(18,8)", nullable: false),
                    Quantity = table.Column<decimal>(type: "decimal(18,8)", nullable: false),
                    Commission = table.Column<decimal>(type: "decimal(18,8)", nullable: false),
                    PnL = table.Column<decimal>(type: "decimal(18,8)", nullable: false),
                    Reason = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    IsCorrect = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Trades", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Trades_BacktestResults_BacktestResultId",
                        column: x => x.BacktestResultId,
                        principalTable: "BacktestResults",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PerformancePoints_BacktestResultId",
                table: "PerformancePoints",
                column: "BacktestResultId");

            migrationBuilder.CreateIndex(
                name: "IX_Trades_BacktestResultId",
                table: "Trades",
                column: "BacktestResultId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PerformancePoints");

            migrationBuilder.DropTable(
                name: "Trades");

            migrationBuilder.DropTable(
                name: "BacktestResults");
        }
    }
}
