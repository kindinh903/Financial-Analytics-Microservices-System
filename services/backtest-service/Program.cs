using Microsoft.EntityFrameworkCore;
using BacktestService.Data;
using BacktestService.Services;
using BacktestService.Models;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Add DbContext
builder.Services.AddDbContext<BacktestDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// Add Mock Services for testing (comment out for production)
builder.Services.AddScoped<IAiService, MockAiService>();
builder.Services.AddScoped<IPriceService, MockPriceService>();

// Add HttpClient for external services (uncomment for production)
// builder.Services.AddHttpClient<IAiService, AiService>(client =>
// {
//     client.BaseAddress = new Uri(builder.Configuration["Services:AiService:BaseUrl"] ?? "http://ai-service:8084");
// });

// builder.Services.AddHttpClient<IPriceService, PriceService>(client =>
// {
//     client.BaseAddress = new Uri(builder.Configuration["Services:PriceService:BaseUrl"] ?? "http://price-service:8081");
// });

// Add custom services
builder.Services.AddScoped<IBacktestService, BacktestService.Services.BacktestService>();
builder.Services.AddScoped<StrategyBacktestEngine>();
builder.Services.AddScoped<IPerformanceMetricsService, PerformanceMetricsService>();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseAuthorization();
app.MapControllers();

// Ensure database is created
using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<BacktestDbContext>();
    context.Database.EnsureCreated();
}

app.Run();
