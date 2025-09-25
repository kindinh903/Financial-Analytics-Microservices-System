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
            return await GetUserPermissionsAsync(userId, null, null, null);
        }

        public async Task<UserPermissionsDto?> GetUserPermissionsAsync(
            string userId,
            string? email,
            string? firstName,
            string? lastName
            )
        {
            var url = $"{_userServiceBaseUrl}/api/user/{userId}/permissions";
            try
            {
                Console.WriteLine($"Requesting user permissions for userId: {userId}");
                using var request = new HttpRequestMessage(HttpMethod.Get, url);
                if (!string.IsNullOrEmpty(userId)) request.Headers.Add("X-User-Id", userId);
                request.Headers.Add("X-User-Role", "user");
                if (!string.IsNullOrEmpty(email)) request.Headers.Add("X-User-Email", email);
                if (!string.IsNullOrEmpty(firstName)) request.Headers.Add("X-User-First-Name", firstName);
                if (!string.IsNullOrEmpty(lastName)) request.Headers.Add("X-User-Last-Name", lastName);

                var response = await _httpClient.SendAsync(request);
                Console.WriteLine($"Received response with status code: {response.StatusCode}");
                Console.WriteLine($"Response content: {await response.Content.ReadAsStringAsync()}");
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
