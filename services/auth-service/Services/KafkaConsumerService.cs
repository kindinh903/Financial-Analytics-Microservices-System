using AuthService.Utils;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.DependencyInjection;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace AuthService.Services
{
    public class KafkaConsumerService : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<KafkaConsumerService> _logger;

        public KafkaConsumerService(IServiceProvider serviceProvider, ILogger<KafkaConsumerService> logger)
        {
            _serviceProvider = serviceProvider;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("Kafka Consumer Service is starting...");

            // Add delay to allow main application to start first
            await Task.Delay(5000, stoppingToken);

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    // Use a scope to get scoped services
                    using var scope = _serviceProvider.CreateScope();
                    var kafkaConsumer = scope.ServiceProvider.GetRequiredService<KafkaConsumer>();
                    
                    _logger.LogInformation("Starting Kafka consumer for user updates...");
                    await kafkaConsumer.ConsumeUserUpdateClaimsAsync(stoppingToken);
                }
                catch (OperationCanceledException)
                {
                    _logger.LogInformation("Kafka Consumer Service was cancelled");
                    break;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error in Kafka Consumer Service, retrying in 30 seconds...");
                    await Task.Delay(30000, stoppingToken); // Wait 30 seconds before retrying
                }
            }
        }

        public override async Task StopAsync(CancellationToken cancellationToken)
        {
            _logger.LogInformation("Kafka Consumer Service is stopping...");
            await base.StopAsync(cancellationToken);
        }
    }
}
