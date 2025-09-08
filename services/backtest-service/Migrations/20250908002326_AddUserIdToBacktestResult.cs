using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BacktestService.Migrations
{
    /// <inheritdoc />
    public partial class AddUserIdToBacktestResult : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "UserId",
                table: "BacktestResults",
                type: "nvarchar(450)",
                maxLength: 450,
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "UserId",
                table: "BacktestResults");
        }
    }
}
