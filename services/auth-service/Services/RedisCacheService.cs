using StackExchange.Redis;
using System.Text.Json;
using System.Threading.Tasks;

namespace AuthService.Services
{
    public class RedisCacheService
    {
        private readonly IDatabase _db;
        public RedisCacheService(IConnectionMultiplexer redis)
        {
            _db = redis.GetDatabase();
            if (redis.IsConnected)
            {
                Console.WriteLine("[Redis] Connected to Redis successfully.");
            }
            else
            {
                Console.WriteLine("[Redis] Failed to connect to Redis.");
            }
        }

        public async Task<T?> GetAsync<T>(string key)
        {
            var value = await _db.StringGetAsync(key);
            if (value.IsNullOrEmpty) return default;
            return JsonSerializer.Deserialize<T>(value!);
        }

        public async Task SetAsync<T>(string key, T value, int expireSeconds = 3600)
        {
            var json = JsonSerializer.Serialize(value);
            await _db.StringSetAsync(key, json, TimeSpan.FromSeconds(expireSeconds));
        }

        public async Task RemoveAsync(string key)
        {
            await _db.KeyDeleteAsync(key);
        }
    }
}
