using Grpc.Core;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using AuthService.Data;
using AuthService.Models;
using AuthService.Protos;
using AuthService.Services;

namespace AuthService.GrpcServices
{
    public class AuthGrpcService : Protos.AuthService.AuthServiceBase
    {
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly ApplicationDbContext _dbContext;
        private readonly RedisCacheService _redisCacheService;
        private readonly ILogger<AuthGrpcService> _logger;

        public AuthGrpcService(
            UserManager<ApplicationUser> userManager,
            ApplicationDbContext dbContext,
            RedisCacheService redisCacheService,
            ILogger<AuthGrpcService> logger)
        {
            _userManager = userManager;
            _dbContext = dbContext;
            _redisCacheService = redisCacheService;
            _logger = logger;
        }

        public override async Task<DeleteUserResponse> DeleteUser(DeleteUserRequest request, ServerCallContext context)
        {
            try
            {
                _logger.LogInformation($"Received delete user request for userId: {request.UserId} from requester: {request.RequesterId}");

                var user = await _userManager.FindByIdAsync(request.UserId);
                if (user == null)
                {
                    return new DeleteUserResponse
                    {
                        Success = false,
                        Message = "User not found",
                        DeletedTokensCount = 0
                    };
                }

                // Delete all refresh tokens for this user
                var refreshTokens = await _dbContext.RefreshTokens
                    .Where(rt => rt.UserId == request.UserId)
                    .ToListAsync();

                var deletedTokensCount = refreshTokens.Count;
                _dbContext.RefreshTokens.RemoveRange(refreshTokens);

                // Delete user account
                var result = await _userManager.DeleteAsync(user);
                if (!result.Succeeded)
                {
                    return new DeleteUserResponse
                    {
                        Success = false,
                        Message = string.Join(", ", result.Errors.Select(e => e.Description)),
                        DeletedTokensCount = 0
                    };
                }

                // Remove user from Redis cache
                await _redisCacheService.RemoveAsync(request.UserId);

                await _dbContext.SaveChangesAsync();

                _logger.LogInformation($"Successfully deleted user {request.UserId} and {deletedTokensCount} tokens");

                return new DeleteUserResponse
                {
                    Success = true,
                    Message = "User deleted successfully",
                    DeletedTokensCount = deletedTokensCount
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error deleting user {request.UserId}");
                return new DeleteUserResponse
                {
                    Success = false,
                    Message = $"Internal error: {ex.Message}",
                    DeletedTokensCount = 0
                };
            }
        }

        public override async Task<InvalidateUserSessionsResponse> InvalidateUserSessions(InvalidateUserSessionsRequest request, ServerCallContext context)
        {
            try
            {
                _logger.LogInformation($"Received invalidate sessions request for userId: {request.UserId}");

                // Invalidate all refresh tokens for this user
                var refreshTokens = await _dbContext.RefreshTokens
                    .Where(rt => rt.UserId == request.UserId && !rt.IsRevoked)
                    .ToListAsync();

                foreach (var token in refreshTokens)
                {
                    token.IsRevoked = true;
                    token.RevokedAt = DateTime.UtcNow;
                }

                // Remove user permissions from Redis cache
                await _redisCacheService.RemoveAsync(request.UserId);

                await _dbContext.SaveChangesAsync();

                _logger.LogInformation($"Successfully invalidated {refreshTokens.Count} sessions for user {request.UserId}");

                return new InvalidateUserSessionsResponse
                {
                    Success = true,
                    Message = "User sessions invalidated successfully",
                    InvalidatedTokensCount = refreshTokens.Count
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error invalidating sessions for user {request.UserId}");
                return new InvalidateUserSessionsResponse
                {
                    Success = false,
                    Message = $"Internal error: {ex.Message}",
                    InvalidatedTokensCount = 0
                };
            }
        }

        public override async Task<GetUserInfoResponse> GetUserInfo(GetUserInfoRequest request, ServerCallContext context)
        {
            try
            {
                var user = await _userManager.FindByIdAsync(request.UserId);
                if (user == null)
                {
                    return new GetUserInfoResponse
                    {
                        Success = false,
                        Message = "User not found",
                        UserInfo = null
                    };
                }

                return new GetUserInfoResponse
                {
                    Success = true,
                    Message = "User found",
                    UserInfo = new Protos.UserInfo
                    {
                        Id = user.Id,
                        Email = user.Email ?? "",
                        FirstName = user.FirstName ?? "",
                        LastName = user.LastName ?? "",
                        Role = user.Role ?? "user",
                        IsActive = user.IsActive,
                        IsEmailVerified = user.IsEmailVerified,
                        CreatedAt = user.CreatedAt.ToString("yyyy-MM-ddTHH:mm:ssZ"),
                        LastLogin = user.LastLogin?.ToString("yyyy-MM-ddTHH:mm:ssZ") ?? ""
                    }
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error getting user info for {request.UserId}");
                return new GetUserInfoResponse
                {
                    Success = false,
                    Message = $"Internal error: {ex.Message}",
                    UserInfo = null
                };
            }
        }
    }
}
