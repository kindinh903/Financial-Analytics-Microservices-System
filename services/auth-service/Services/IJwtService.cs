using AuthService.Models;

namespace AuthService.Services;

public interface IJwtService
{
    string GenerateAccessToken(ApplicationUser user);
    string GenerateRefreshToken(ApplicationUser user);
    string? ValidateRefreshToken(string token);
} 