using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace AuthService.Models.DTOs;
public class UserPermissionsDto
{
    [Required]
    [JsonPropertyName("role")]
    public string Role { get; set; } = "user";
    
    [Required]
    [JsonPropertyName("permissions")]
    public List<string> Permissions { get; set; } = new List<string> { "free" };

    [Required]
    [JsonPropertyName("features")]  
    public List<string> Features { get; set; } = new List<string> { "basic-dashboard", "news" };
}