# Auth Service (.NET)

Authentication service built with ASP.NET Core, Identity, and PostgreSQL.

## Features

- User registration and login
- JWT token authentication
- Refresh token support
- Email verification
- Password reset
- Account lockout protection
- Role-based access control

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/refresh` - Refresh access token
- `GET /api/auth/verify-email/{token}` - Verify email address
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password

## Technology Stack

- **Framework**: ASP.NET Core 8.0
- **Authentication**: ASP.NET Core Identity
- **Database**: PostgreSQL with Entity Framework Core
- **JWT**: JSON Web Tokens for authentication
- **Validation**: Data annotations and model validation

## Prerequisites

- .NET 8.0 SDK
- PostgreSQL database
- Docker (optional)

## Configuration

Update `appsettings.json` with your configuration:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Database=auth_service;Username=postgres;Password=password"
  },
  "Jwt": {
    "Key": "your-super-secret-jwt-key-here-make-it-long-and-secure",
    "Issuer": "https://localhost:8087",
    "Audience": "https://localhost:8087",
    "AccessTokenExpirationMinutes": 1440,
    "RefreshTokenExpirationDays": 7
  }
}
```

## Running

### Development
```bash
dotnet restore
dotnet run
```

### Production
```bash
dotnet publish -c Release
dotnet run --project bin/Release/net8.0/AuthService.dll
```

## Docker

```bash
docker build -t auth-service .
docker run -p 8087:8087 auth-service
```

## Database Setup

1. Create PostgreSQL database
2. Run Entity Framework migrations:
```bash
dotnet ef migrations add InitialCreate
dotnet ef database update
```

## JWT Configuration

The service uses JWT tokens for authentication. Make sure to:

1. Set a strong secret key in `Jwt:Key`
2. Configure proper issuer and audience URLs
3. Set appropriate token expiration times
4. Use HTTPS in production

## Security Features

- Password complexity requirements
- Account lockout after failed attempts
- JWT token validation
- CORS configuration
- Input validation and sanitization
