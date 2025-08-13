# Authentication Service

A comprehensive JWT-based authentication service for the Financial Analytics Microservices System.

## Features

- **User Registration & Login**: Secure user registration with email verification
- **JWT Authentication**: Token-based authentication with access and refresh tokens
- **Role-Based Access Control**: User roles (user, premium, admin)
- **Subscription Management**: Subscription plans (free, basic, premium, enterprise)
- **Password Security**: Bcrypt password hashing with account lockout protection
- **Token Blacklisting**: Secure logout with Redis-based token blacklisting
- **Email Verification**: Email verification system (ready for SMTP integration)
- **Password Reset**: Secure password reset functionality
- **User Preferences**: Theme, timezone, currency, and notification preferences
- **Admin Management**: Complete user management for administrators

## API Endpoints

### Authentication Routes (`/api/auth`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/register` | Register new user | No |
| POST | `/login` | User login | No |
| POST | `/logout` | User logout | Yes |
| POST | `/refresh` | Refresh access token | No |
| GET | `/verify-email/:token` | Verify email address | No |
| POST | `/forgot-password` | Request password reset | No |
| POST | `/reset-password` | Reset password | No |
| GET | `/me` | Get current user | Yes |

### User Management Routes (`/api/users`)

| Method | Endpoint | Description | Auth Required | Role Required |
|--------|----------|-------------|---------------|---------------|
| GET | `/profile` | Get user profile | Yes | Any |
| PUT | `/profile` | Update user profile | Yes | Any |
| PUT | `/change-password` | Change password | Yes | Any |
| PUT | `/preferences` | Update preferences | Yes | Any |
| GET | `/subscription` | Get subscription info | Yes | Any |
| GET | `/` | Get all users | Yes | Admin |
| GET | `/:userId` | Get user by ID | Yes | Admin |
| PUT | `/:userId` | Update user | Yes | Admin |
| PUT | `/subscription/:userId` | Update subscription | Yes | Admin |
| DELETE | `/:userId` | Delete user | Yes | Admin |

## User Model

```javascript
{
  username: String,           // Unique username
  email: String,             // Unique email
  password: String,          // Hashed password
  firstName: String,         // First name
  lastName: String,          // Last name
  role: String,              // 'user', 'premium', 'admin'
  isActive: Boolean,         // Account status
  isEmailVerified: Boolean,  // Email verification status
  preferences: {
    theme: String,           // 'light', 'dark'
    timezone: String,        // User timezone
    currency: String,        // Preferred currency
    notifications: {
      email: Boolean,
      push: Boolean,
      sms: Boolean
    }
  },
  subscription: {
    plan: String,            // 'free', 'basic', 'premium', 'enterprise'
    startDate: Date,
    endDate: Date,
    isActive: Boolean
  }
}
```

## Security Features

### Password Security
- Bcrypt hashing with 12 salt rounds
- Minimum 6 characters with complexity requirements
- Account lockout after 5 failed attempts (2-hour lock)

### JWT Security
- Access tokens: 24 hours expiry
- Refresh tokens: 7 days expiry
- Token blacklisting for secure logout
- Redis-based token storage

### Input Validation
- Comprehensive validation using express-validator
- Email format validation
- Username format validation (alphanumeric + underscore)
- Password complexity requirements

## Environment Variables

Create a `.env` file based on `env.example`:

```bash
# Server Configuration
PORT=8087
NODE_ENV=development

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/financial_analytics

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-jwt-key-change-this-in-production

# Redis Configuration
REDIS_URL=redis://localhost:6379

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3000
```

## Installation & Running

### Local Development

```bash
# Install dependencies
npm install

# Create .env file
cp env.example .env
# Edit .env with your configuration

# Start MongoDB and Redis
docker-compose up mongodb redis

# Run the service
npm run dev
```

### Docker

```bash
# Build and run with docker-compose
docker-compose up auth-service

# Or build individually
docker build -t auth-service .
docker run -p 8087:8087 auth-service
```

## Integration with Other Services

### Token Validation

Other services can validate tokens by making HTTP requests to the auth service:

```javascript
const TokenValidator = require('./utils/tokenValidator');

const validator = new TokenValidator('http://localhost:8087');

// Validate token
const result = await validator.validateToken(token);
if (result.valid) {
  console.log('User:', result.user);
} else {
  console.log('Invalid token:', result.message);
}
```

### Local Token Validation

For services that have access to JWT_SECRET:

```javascript
const validator = new TokenValidator();
const result = validator.validateTokenLocally(token, process.env.JWT_SECRET);
```

## Subscription Plans

| Plan | Features | Price |
|------|----------|-------|
| Free | Basic chart viewing, limited indicators | $0 |
| Basic | Advanced indicators, basic backtesting | $9.99/month |
| Premium | AI predictions, sentiment analysis, advanced backtesting | $29.99/month |
| Enterprise | Custom models, API access, priority support | $99.99/month |

## Error Handling

The service returns consistent error responses:

```javascript
{
  "error": "Error type",
  "message": "Human-readable error message",
  "details": [] // Validation errors (if applicable)
}
```

## Health Check

The service provides a health check endpoint at `/health`:

```bash
curl http://localhost:8087/health
```

Response:
```json
{
  "status": "OK",
  "service": "auth-service",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Future Enhancements

- [ ] Email service integration (SMTP)
- [ ] Two-factor authentication (2FA)
- [ ] OAuth integration (Google, GitHub)
- [ ] Rate limiting per user
- [ ] Audit logging
- [ ] Session management
- [ ] API key management for enterprise users
