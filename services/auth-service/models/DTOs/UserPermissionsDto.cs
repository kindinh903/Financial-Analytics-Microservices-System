using System.ComponentModel.DataAnnotations;

namespace AuthService.Models.DTOs;

/*  role: {
    type: String,
    enum: ['user', 'premium', 'admin'],
    default: 'user'
  },
  // Access permissions and feature flags
  permissions: {
    type: [String],
    default: ['free']
  },
  features: {
    type: [String],
    default: ['basic-dashboard', 'news']
  },
*/
public class UserPermissionsDto
{
    [Required]
    public string Role { get; set; } = "user";
    
    [Required]
    public List<string> Permissions { get; set; } = new List<string> { "free" };

    [Required]
    public List<string> Features { get; set; } = new List<string> { "basic-dashboard", "news" };
}