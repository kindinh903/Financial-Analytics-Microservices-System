using System.Threading.Tasks;
using Confluent.Kafka;

namespace AuthService.Utils
{
    public class KafkaPublisher
    {
    private readonly string _bootstrapServers = Environment.GetEnvironmentVariable("KAFKA_BOOTSTRAP_SERVERS") ?? "localhost:9092";

        public async Task PublishUserRegistered(object user)
        {
            var config = new ProducerConfig { BootstrapServers = _bootstrapServers };

            using var producer = new ProducerBuilder<Null, string>(config).Build();
            var value = System.Text.Json.JsonSerializer.Serialize(user);
            await producer.ProduceAsync("UserRegistered", new Message<Null, string> { Value = value });
        }
    }
}
