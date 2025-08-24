# User Service

User management service built with Node.js, Express, and MongoDB.

## Features

- User profile management
- User preferences (theme, timezone, currency, notifications)
- Subscription management
- Admin user management
- JWT authentication integration

## API Endpoints

### User Profile
- `GET /api/users/me` - Get current user profile
- `PUT /api/users/me` - Update current user profile
- `PUT /api/users/me/preferences` - Update user preferences
- `GET /api/users/me/subscription` - Get subscription info

### Admin Management
- `GET /api/users` - Get all users (admin only)
- `GET /api/users/:userId` - Get user by ID (admin only)
- `PUT /api/users/:userId` - Update user (admin only)
- `DELETE /api/users/:userId` - Delete user (admin only)
- `PUT /api/users/subscription/:userId` - Update user subscription (admin only)

## Environment Variables

Copy `env.example` to `.env` and configure:

```bash
PORT=8088
MONGODB_URI=mongodb://localhost:27017/user_management
JWT_SECRET=your-super-secret-jwt-key-here
```

## Installation

```bash
npm install
```

## Running

```bash
# Development
npm run dev

# Production
npm start
```

## Docker

```bash
docker build -t user-service .
docker run -p 8088:8088 user-service
```

## Dependencies

- Express.js - Web framework
- Mongoose - MongoDB ODM
- JWT - Authentication
- Express Validator - Input validation
- Helmet - Security headers
- CORS - Cross-origin resource sharing 