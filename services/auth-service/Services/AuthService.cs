using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using AuthService.Models;
using AuthService.Models.DTOs;
using AuthService.Services;
using AuthService.Data;

namespace AuthService.Services;

public class AuthService : IAuthService
{
    private readonly UserManager<ApplicationUser> _userManager;
    internal readonly IJwtService _jwtService;
    private readonly ApplicationDbContext _dbContext;
    private readonly RedisCacheService _redisCacheService;
    private readonly UserServiceClient _userServiceClient;

    public AuthService(UserManager<ApplicationUser> userManager, IJwtService jwtService, ApplicationDbContext dbContext, RedisCacheService redisCacheService, UserServiceClient userServiceClient)
    {
        _userManager = userManager;
        _jwtService = jwtService;
        _dbContext = dbContext;
        _redisCacheService = redisCacheService;
        _userServiceClient = userServiceClient;
    }

    public async Task<AuthResponse> RegisterAsync(RegisterRequest request)
    {
        try
        {
            // Check if user already exists
            var existingUser = await _userManager.FindByEmailAsync(request.Email);
            if (existingUser != null)
            {
                return new AuthResponse
                {
                    Success = false,
                    Message = "User with this email already exists"
                };
            }

            // Create new user
            var user = new ApplicationUser
            {
                UserName = request.Email,
                Email = request.Email,
                FirstName = request.FirstName,
                LastName = request.LastName,
                Role = "user",
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };

            var result = await _userManager.CreateAsync(user, request.Password);
            if (!result.Succeeded)
            {
                return new AuthResponse
                {
                    Success = false,
                    Message = string.Join(", ", result.Errors.Select(e => e.Description))
                };
            }

            // Generate tokens
            var accessToken = _jwtService.GenerateAccessToken(user);
            var refreshToken = _jwtService.GenerateRefreshToken(user);

            // Save refresh token to DB
            var refreshTokenEntity = new RefreshToken
            {
                Token = refreshToken,
                UserId = user.Id,
                ExpiresAt = DateTime.UtcNow.AddDays(14),
                IsRevoked = false,
                CreatedAt = DateTime.UtcNow
            };
            _dbContext.RefreshTokens.Add(refreshTokenEntity);
            await _dbContext.SaveChangesAsync();

            return new AuthResponse
            {
                Success = true,
                Message = "User registered successfully",
                AccessToken = accessToken,
                RefreshToken = refreshToken,
                User = new UserInfo
                {
                    Id = user.Id,
                    Email = user.Email,
                    FirstName = user.FirstName,
                    LastName = user.LastName,
                    Role = user.Role,
                    IsEmailVerified = user.IsEmailVerified
                }
            };
        }
        catch (Exception ex)
        {
            return new AuthResponse
            {
                Success = false,
                Message = "Registration failed: " + ex.Message
            };
        }
    }

    public async Task<AuthResponse> LoginAsync(LoginRequest request)
    {
        try
        {
            var user = await _userManager.FindByEmailAsync(request.Email);
            if (user == null)
            {
                return new AuthResponse
                {
                    Success = false,
                    Message = "Invalid email or password"
                };
            }

            if (!user.IsActive)
            {
                return new AuthResponse
                {
                    Success = false,
                    Message = "Account is disabled"
                };
            }

            var isPasswordValid = await _userManager.CheckPasswordAsync(user, request.Password);
            if (!isPasswordValid)
            {
                // Increment login attempts
                user.LoginAttempts++;
                if (user.LoginAttempts >= 5)
                {
                    user.AccountLockoutEnd = DateTime.UtcNow.AddHours(2);
                }
                await _userManager.UpdateAsync(user);

                return new AuthResponse
                {
                    Success = false,
                    Message = "Invalid email or password"
                };
            }

            // Reset login attempts on successful login
            user.LoginAttempts = 0;
            user.AccountLockoutEnd = null;
            user.LastLogin = DateTime.UtcNow;
            await _userManager.UpdateAsync(user);

            // Generate tokens
            var accessToken = _jwtService.GenerateAccessToken(user);
            var refreshToken = _jwtService.GenerateRefreshToken(user);

            // Save refresh token to DB
            var refreshTokenEntity = new RefreshToken
            {
                Token = refreshToken,
                UserId = user.Id,
                ExpiresAt = DateTime.UtcNow.AddDays(7),
                IsRevoked = false,
                CreatedAt = DateTime.UtcNow
            };
            _dbContext.RefreshTokens.Add(refreshTokenEntity);
            await _dbContext.SaveChangesAsync();

            return new AuthResponse
            {
                Success = true,
                Message = "Login successful",
                AccessToken = accessToken,
                RefreshToken = refreshToken,
                User = new UserInfo
                {
                    Id = user.Id,
                    Email = user.Email,
                    FirstName = user.FirstName,
                    LastName = user.LastName,
                    Role = user.Role,
                    IsEmailVerified = user.IsEmailVerified
                }
            };
        }
        catch (Exception ex)
        {
            return new AuthResponse
            {
                Success = false,
                Message = "Login failed: " + ex.Message
            };
        }
    }

    public async Task<AuthResponse> RefreshTokenAsync(string refreshToken)
    {
        try
        {
            var userId = _jwtService.ValidateRefreshToken(refreshToken);
            if (string.IsNullOrEmpty(userId))
            {
                return new AuthResponse
                {
                    Success = false,
                    Message = "Invalid refresh token"
                };
            }

            var user = await _userManager.FindByIdAsync(userId);
            if (user == null || !user.IsActive)
            {
                return new AuthResponse
                {
                    Success = false,
                    Message = "User not found or inactive"
                };
            }

            var userPermissions = await _redisCacheService.GetAsync<UserPermissionsDto>(userId);
            if (userPermissions == null)
            {
                Console.WriteLine("User permissions not found in Redis cache during refresh, userPermissions: ", userPermissions);
                userPermissions = await _userServiceClient.GetUserPermissionsAsync(
                    userId,
                    user.Email,
                    user.FirstName,
                    user.LastName
                );
                Console.WriteLine("Fetched user permissions from user service during refresh: ", userPermissions);
                if (userPermissions != null)
                    await _redisCacheService.SetAsync(userId, userPermissions);
                else
                {
                    Console.WriteLine("User permissions not found in user service during refresh");
                    // Fallback to basic permissions instead of failing
                    userPermissions = new UserPermissionsDto
                    {
                        Role = user.Role,
                        Permissions = new List<string> { "free" },
                        Features = new List<string> { "basic-dashboard", "news" }
                    };
                }
            }
            else
            {
                Console.WriteLine("User permissions found in Redis cache during refresh");
            }

            // ✅ FIX: Generate access token with permissions
            var claims = new Dictionary<string, object?>
            {
                ["permissions"] = userPermissions?.Permissions ?? new List<string>(),
                ["features"] = userPermissions?.Features ?? new List<string>()
            };

            var appUser = new ApplicationUser {
                Id = user.Id,
                Email = user.Email,
                FirstName = user.FirstName,
                LastName = user.LastName,
                Role = userPermissions?.Role ?? "user",
                IsEmailVerified = user.IsEmailVerified
            };
            var enrichedAccessToken = _jwtService.GenerateAccessToken(appUser, claims);

            return new AuthResponse
            {
                Success = true,
                Message = "Token refreshed successfully",
                AccessToken = enrichedAccessToken,
                RefreshToken = null, // Không trả về refresh token mới
                User = new UserInfo
                {
                    Id = user.Id,
                    Email = user.Email,
                    FirstName = user.FirstName,
                    LastName = user.LastName,
                    Role = userPermissions?.Role ?? user.Role,
                    IsEmailVerified = user.IsEmailVerified
                }
            };
        }
        catch (Exception ex)
        {
            return new AuthResponse
            {
                Success = false,
                Message = "Token refresh failed: " + ex.Message
            };
        }
    }

    public async Task<bool> LogoutAsync(string refreshToken)
    {
        // Remove refresh token from DB
        Console.WriteLine("Logging out token: " + refreshToken);
        var token = await _dbContext.RefreshTokens.FirstOrDefaultAsync(rt => rt.Token == refreshToken);
        Console.WriteLine("Found refresh token: " + (token != null));
        if (token != null)
        {
            _dbContext.RefreshTokens.Remove(token);
            await _dbContext.SaveChangesAsync();
            return true;
        }
        return false;
    }

    public async Task<bool> VerifyEmailAsync(string token)
    {
        try
        {
            var user = await _userManager.Users.FirstOrDefaultAsync(u => u.EmailVerificationToken == token);
            if (user == null || user.EmailVerificationExpires < DateTime.UtcNow)
            {
                return false;
            }

            user.IsEmailVerified = true;
            user.EmailVerificationToken = null;
            user.EmailVerificationExpires = null;

            await _userManager.UpdateAsync(user);
            return true;
        }
        catch
        {
            return false;
        }
    }

    public async Task<bool> ForgotPasswordAsync(string email)
    {
        try
        {
            var user = await _userManager.FindByEmailAsync(email);
            if (user == null)
            {
                // Don't reveal if email exists or not
                return true;
            }

            var token = await _userManager.GeneratePasswordResetTokenAsync(user);
            user.PasswordResetToken = token;
            user.PasswordResetExpires = DateTime.UtcNow.AddHours(1);

            await _userManager.UpdateAsync(user);

            // TODO: Send email with reset token
            return true;
        }
        catch
        {
            return false;
        }
    }

    public async Task<bool> ResetPasswordAsync(string token, string newPassword)
    {
        try
        {
            var user = await _userManager.Users.FirstOrDefaultAsync(u => u.PasswordResetToken == token);
            if (user == null || user.PasswordResetExpires < DateTime.UtcNow)
            {
                return false;
            }

            var result = await _userManager.ResetPasswordAsync(user, token, newPassword);
            if (result.Succeeded)
            {
                user.PasswordResetToken = null;
                user.PasswordResetExpires = null;
                await _userManager.UpdateAsync(user);
                return true;
            }

            return false;
        }
        catch
        {
            return false;
        }
    }
} 