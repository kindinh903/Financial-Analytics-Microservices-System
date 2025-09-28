using System;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Confluent.Kafka;
using Microsoft.Extensions.Logging;
using AuthService.Services;
using AuthService.Models.DTOs;

namespace AuthService.Utils
{
    public class KafkaConsumer
    {
        private readonly string _bootstrapServers;
        private readonly RedisCacheService _redisCacheService;
        private readonly ILogger<KafkaConsumer> _logger;

        public KafkaConsumer(RedisCacheService redisCacheService, ILogger<KafkaConsumer> logger)
        {
            _bootstrapServers = Environment.GetEnvironmentVariable("KAFKA_BOOTSTRAP_SERVERS") ?? "localhost:9092";
            _redisCacheService = redisCacheService;
            _logger = logger;
        }

        public async Task ConsumeUserUpdateClaimsAsync(CancellationToken cancellationToken = default)
        {
            var config = new ConsumerConfig
            {
                BootstrapServers = _bootstrapServers,
                GroupId = "auth-service-consumer",
                AutoOffsetReset = AutoOffsetReset.Earliest,
                EnableAutoCommit = false,
                MaxPollIntervalMs = 300000,
                SessionTimeoutMs = 10000,
                HeartbeatIntervalMs = 3000
            };

            using var consumer = new ConsumerBuilder<Ignore, string>(config)
                .SetErrorHandler((_, e) => _logger.LogError($"Error: {e.Reason}"))
                .Build();

            try
            {
                consumer.Subscribe("user-updates");
                _logger.LogInformation("Kafka consumer started. Listening for user updates...");

                while (!cancellationToken.IsCancellationRequested)
                {
                    try
                    {
                        var consumeResult = consumer.Consume(cancellationToken);
                        
                        if (consumeResult?.Message?.Value != null)
                        {
                            await ProcessUserUpdateClaimsAsync(consumeResult);
                            consumer.Commit(consumeResult);
                        }
                    }
                    catch (ConsumeException ex)
                    {
                        _logger.LogError(ex, "Error consuming message from Kafka");
                    }
                    catch (OperationCanceledException)
                    {
                        _logger.LogInformation("Kafka consumer operation was cancelled");
                        break;
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Unexpected error in Kafka consumer");
                        await Task.Delay(5000, cancellationToken); // Wait before retrying
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Fatal error in Kafka consumer");
                throw;
            }
            finally
            {
                try
                {
                    consumer.Close();
                    _logger.LogInformation("Kafka consumer closed gracefully");
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error closing Kafka consumer");
                }
            }
        }

        private async Task ProcessUserUpdateClaimsAsync(ConsumeResult<Ignore, string> consumeResult)
        {
            try
            {
                _logger.LogDebug($"Processing message from topic: {consumeResult.Topic}, partition: {consumeResult.Partition}, offset: {consumeResult.Offset}");

                var userUpdate = JsonSerializer.Deserialize<UpdateUserDto>(consumeResult.Message.Value);
                
                if (userUpdate == null)
                {
                    _logger.LogWarning("Received null user update message");
                    return;
                }

                if (string.IsNullOrEmpty(userUpdate.AuthUserId))
                {
                    _logger.LogWarning("Received user update with empty AuthUserId");
                    return;
                }

                // Cache using same key format as AuthService (userId directly)
                var cacheKey = userUpdate.AuthUserId;
                var permissions = new UserPermissionsDto
                {
                    Role = userUpdate.Role,
                    Permissions = userUpdate.Permissions,
                    Features = userUpdate.Features
                };

                await _redisCacheService.SetAsync(cacheKey, permissions);

                _logger.LogInformation($"Successfully processed user update for auth user ID: {userUpdate.AuthUserId}");
            }
            catch (JsonException ex)
            {
                _logger.LogError(ex, $"Failed to deserialize user update message: {consumeResult.Message.Value}");
                throw;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Failed to process user update message: {consumeResult.Message.Value}");
                throw;
            }
        }
    }
}