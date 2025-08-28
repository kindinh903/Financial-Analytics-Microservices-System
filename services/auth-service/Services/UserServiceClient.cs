using System.Net.Http;
using System.Net.Http.Json;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using AuthService.Models.DTOs;

namespace AuthService.Services
{
    public class UserServiceClient
    {
        private readonly HttpClient _httpClient;
        private readonly string _userServiceBaseUrl;

        public UserServiceClient(HttpClient httpClient, IConfiguration configuration)
        {
            _httpClient = httpClient;
            _userServiceBaseUrl = configuration["UserService:BaseUrl"] ?? "http://user-service:8088";
        }

        public async Task<UserPermissionsDto?> GetUserPermissionsAsync(string userId)
        {
            var url = $"{_userServiceBaseUrl}/api/users/{userId}/permissions";
            try
            {
                Console.WriteLine($"Requesting user permissions for userId: {userId}");
                var response = await _httpClient.GetAsync(url);
                if (response.IsSuccessStatusCode)
                {
                    return await response.Content.ReadFromJsonAsync<UserPermissionsDto>();
                }
                Console.WriteLine($"Failed to get user permissions for userId: {userId}, StatusCode: {response.StatusCode}");
                return null;
            }
            catch
            {
                return null;
            }
        }
    }
}
