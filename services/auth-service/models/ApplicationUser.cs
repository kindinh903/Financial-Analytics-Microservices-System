using Microsoft.AspNetCore.Identity;

namespace AuthService.Models;

public class ApplicationUser : IdentityUser
{
    public string FirstName { get; set; } = string.Empty; //Bỏ cũng được
    public string LastName { get; set; } = string.Empty; //Bỏ cũng được
    public string Role { get; set; } = "user";
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? LastLogin { get; set; }
    public int LoginAttempts { get; set; } = 0;
    public DateTime? AccountLockoutEnd { get; set; }
    
    // Email verification
    public bool IsEmailVerified { get; set; } = false;
    public string? EmailVerificationToken { get; set; }
    public DateTime? EmailVerificationExpires { get; set; }
    
    // Password reset
    public string? PasswordResetToken { get; set; }
    public DateTime? PasswordResetExpires { get; set; }
    // Navigation property for refresh tokens
    public ICollection<RefreshToken> RefreshTokens { get; set; } = new List<RefreshToken>();
} 