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

// Add HttpClient for external services
builder.Services.AddHttpClient<IAiService, AiService>(client =>
{
    client.BaseAddress = new Uri(builder.Configuration["Services:AiService:BaseUrl"] ?? "http://ai-service:8001");
});

builder.Services.AddHttpClient<IPriceService, PriceService>(client =>
{
    client.BaseAddress = new Uri(builder.Configuration["Services:PriceService:BaseUrl"] ?? "http://price-service:8084");
});

// Add custom services
builder.Services.AddScoped<IBacktestService, BacktestEngine>();
builder.Services.AddScoped<IPerformanceMetricsService, PerformanceMetricsService>();

// Configure CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseCors("AllowAll");
app.UseAuthorization();
app.MapControllers();

// Ensure database is created
using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<BacktestDbContext>();
    context.Database.EnsureCreated();
}

app.Run();
