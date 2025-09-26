using AuthService.Models;
using Microsoft.AspNetCore.Mvc;
using AuthService.Models.DTOs;
using AuthService.Services;
using AuthService.Utils;
using AuthService.Models;

namespace AuthService.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;
    private readonly IJwtService _jwtService;
    private readonly KafkaPublisher _kafkaPublisher = new KafkaPublisher();
    private readonly RedisCacheService _redisCacheService;
    private readonly UserServiceClient _userServiceClient;
    public AuthController(IAuthService authService, IJwtService jwtService, RedisCacheService redisCacheService, UserServiceClient userServiceClient)
    {
        _authService = authService;
        _jwtService = jwtService;
        _redisCacheService = redisCacheService;
        _userServiceClient = userServiceClient;
    }

    private void SetRefreshTokenCookie(string refreshToken)
    {
        var cookieOptions = new CookieOptions
        {
            HttpOnly = true,
            Secure = false,  // Set false cho development (HTTP), true cho production (HTTPS)
            SameSite = SameSiteMode.Lax, // Lax thay vì Strict để tương thích với cross-origin requests
            Expires = DateTime.UtcNow.AddDays(14), // 14 ngày
            Path = "/"
        };

        Response.Cookies.Append("refreshToken", refreshToken, cookieOptions);
    }

    private string? GetRefreshTokenFromCookie()
    {
        return Request.Cookies["refreshToken"];
    }

    private void ClearRefreshTokenCookie()
    {
        Response.Cookies.Delete("refreshToken", new CookieOptions
        {
            HttpOnly = true,
            Secure = false,  // Set false cho development
            SameSite = SameSiteMode.Lax,
            Path = "/"
        });
    }

    [HttpPost("register")]
    public async Task<ActionResult<AuthResponse>> Register([FromBody] RegisterRequest request)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        var response = await _authService.RegisterAsync(request);

        if (response.Success)
        {
            var userEvent = new {
                authUserId = response.User.Id,
                firstName = response.User.FirstName,
                lastName = response.User.LastName,
                email = response.User.Email
            };
            
            // Publish to Kafka asynchronously without waiting (fire and forget)
            _ = Task.Run(async () => {
                try {
                    await _kafkaPublisher.PublishUserRegistered(userEvent);
                } catch (Exception ex) {
                    Console.WriteLine($"Kafka publish error: {ex.Message}");
                }
            });
            
            // Lưu refresh token vào HTTP-only cookie
            SetRefreshTokenCookie(response.RefreshToken);
            
            response.RefreshToken = null;
            
            // Return the response with tokens immediately
            return Ok(response);

        }

        return BadRequest(response);
    }

    [HttpPost("login")]
    public async Task<ActionResult<AuthResponse>> Login([FromBody] LoginRequest request)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        var response = await _authService.LoginAsync(request);
        if (!response.Success || response.User == null)
        {
            return Unauthorized(response);
        }

        // Lấy thông tin permissions/tier/features từ cache hoặc UserService
        var userId = response.User.Id;
        var userPermissions = await _redisCacheService.GetAsync<UserPermissionsDto>(userId);
        if (userPermissions == null)
        {
            Console.WriteLine("User permissions not found in Redis cache, userPermissions: ", userPermissions);
            userPermissions = await _userServiceClient.GetUserPermissionsAsync(
                userId,
                response.User.Email,
                response.User.FirstName,
                response.User.LastName
            );
            Console.WriteLine("Fetched user permissions from user service: ", userPermissions);
            if (userPermissions != null)
                await _redisCacheService.SetAsync(userId, userPermissions);
            else
            {
                Console.WriteLine("User permissions not found in user service");
                return Unauthorized(response);
            }
        }
        else
        {
            Console.WriteLine("User permissions found in Redis cache");
        }

        var claims = new Dictionary<string, object?>
        {
            ["permissions"] = userPermissions?.Permissions ?? new List<string>(),
            ["role"] = userPermissions?.Role ?? "user",
            ["features"] = userPermissions?.Features ?? new List<string>()
        };

        var appUser = new ApplicationUser {
            Id = response.User.Id,
            Email = response.User.Email,
            FirstName = response.User.FirstName,
            LastName = response.User.LastName,
            Role = userPermissions?.Role ?? "user",
            IsEmailVerified = response.User.IsEmailVerified
        };
        var enrichedAccessToken = _jwtService.GenerateAccessToken(appUser, claims);

        response.AccessToken = enrichedAccessToken;
        
        // Lưu refresh token vào HTTP-only cookie
        SetRefreshTokenCookie(response.RefreshToken);
        
        response.RefreshToken = null;
        
        return Ok(response);
    }

    [HttpPost("logout")]
    public async Task<ActionResult> Logout()
    {
        // Lấy refresh token từ cookie
        var refreshToken = GetRefreshTokenFromCookie();
        
        // Luôn xóa refresh token cookie trước
        ClearRefreshTokenCookie();

        // Nếu có refresh token, thì revoke nó trong database
        if (!string.IsNullOrEmpty(refreshToken))
        {
            var result = await _authService.LogoutAsync(refreshToken);
            if (result)
            {
                return Ok(new { message = "Logout successful" });
            }
            else
            {
                // Ngay cả khi không tìm thấy token trong DB, vẫn coi là logout thành công
                return Ok(new { message = "Logout successful (token not found in database)" });
            }
        }

        // Không có refresh token trong cookie, nhưng vẫn coi là logout thành công
        return Ok(new { message = "Logout successful (no refresh token found)" });
    }

    [HttpPost("refresh")]
    public async Task<ActionResult<AuthResponse>> RefreshToken()
    {
        var refreshToken = GetRefreshTokenFromCookie();
        if (string.IsNullOrEmpty(refreshToken))
        {
            return BadRequest(new { message = "Refresh token not found in cookie" });
        }

        var response = await _authService.RefreshTokenAsync(refreshToken);
        
        if (response.Success)
        {
            // Lưu refresh token mới vào cookie
            SetRefreshTokenCookie(response.RefreshToken);
            
            response.RefreshToken = null;
            
            return Ok(response);
        }

        return Unauthorized(response);
    }

    [HttpGet("verify-email/{token}")]
    public async Task<ActionResult> VerifyEmail(string token)
    {
        var result = await _authService.VerifyEmailAsync(token);
        
        if (result)
        {
            return Ok(new { message = "Email verified successfully" });
        }

        return BadRequest(new { message = "Invalid or expired verification token" });
    }

    [HttpPost("forgot-password")]
    public async Task<ActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        var result = await _authService.ForgotPasswordAsync(request.Email);
        
        if (result)
        {
            return Ok(new { message = "If an account with that email exists, a password reset link has been sent" });
        }

        return BadRequest(new { message = "Failed to process password reset request" });
    }

    [HttpPost("reset-password")]
    public async Task<ActionResult> ResetPassword([FromBody] ResetPasswordRequest request)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        var result = await _authService.ResetPasswordAsync(request.Token, request.NewPassword);
        
        if (result)
        {
            return Ok(new { message = "Password reset successfully" });
        }

        return BadRequest(new { message = "Invalid or expired reset token" });
    }
}

// Additional DTOs
public class RefreshTokenRequest
{
    public string RefreshToken { get; set; } = string.Empty;
}

public class ForgotPasswordRequest
{
    public string Email { get; set; } = string.Empty;
}

public class ResetPasswordRequest
{
    public string Token { get; set; } = string.Empty;
    public string NewPassword { get; set; } = string.Empty;
}