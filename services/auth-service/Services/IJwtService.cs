using AuthService.Models;

namespace AuthService.Services;

public interface IJwtService
{
    string GenerateAccessToken(ApplicationUser user);
    string GenerateAccessToken(ApplicationUser user, IDictionary<string, object?>? extraClaims);
    string GenerateRefreshToken(ApplicationUser user);
    string? ValidateRefreshToken(string token);
} 