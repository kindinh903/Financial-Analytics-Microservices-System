using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace AuthService.Models.DTOs;

public class UpdateUserDto
{
    [JsonPropertyName("authUserId")]
    public string AuthUserId { get; set; } = string.Empty;
    
    [JsonPropertyName("email")]
    public string Email { get; set; } = string.Empty;
    
    [JsonPropertyName("firstName")]
    public string FirstName { get; set; } = string.Empty;
    
    [JsonPropertyName("lastName")]
    public string LastName { get; set; } = string.Empty;
    
    [JsonPropertyName("role")]
    public string Role { get; set; } = string.Empty;
    
    [JsonPropertyName("permissions")]
    public List<string> Permissions { get; set; } = new List<string>();
    
    [JsonPropertyName("features")]
    public List<string> Features { get; set; } = new List<string>();
    
    [JsonPropertyName("isActive")]
    public bool IsActive { get; set; } = true;
    
    [JsonPropertyName("updatedAt")]
    public DateTime UpdatedAt { get; set; }
    
    // Backward compatibility - map AuthUserId to Id
    [JsonIgnore]
    public string Id => AuthUserId;
}