using Microsoft.AspNetCore.Mvc;
using AuthService.Models.DTOs;
using AuthService.Services;

namespace AuthService.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;

    public AuthController(IAuthService authService)
    {
        _authService = authService;
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
            return CreatedAtAction(nameof(Register), response);
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
        
        if (response.Success)
        {
            return Ok(response);
        }

        return Unauthorized(response);
    }

    [HttpPost("logout")]
    public async Task<ActionResult> Logout([FromHeader(Name = "Authorization")] string authorization)
    {
        if (string.IsNullOrEmpty(authorization) || !authorization.StartsWith("Bearer "))
        {
            return BadRequest("Invalid authorization header");
        }

        var token = authorization.Substring("Bearer ".Length);
        var result = await _authService.LogoutAsync(token);
        
        if (result)
        {
            return Ok(new { message = "Logout successful" });
        }

        return BadRequest(new { message = "Logout failed" });
    }

    [HttpPost("refresh")]
    public async Task<ActionResult<AuthResponse>> RefreshToken([FromBody] RefreshTokenRequest request)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        var response = await _authService.RefreshTokenAsync(request.RefreshToken);
        
        if (response.Success)
        {
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