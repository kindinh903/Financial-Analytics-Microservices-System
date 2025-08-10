const jwt = require('jsonwebtoken');
const User = require('../models/User');
const redis = require('redis');

// Redis client for token blacklisting
const redisClient = redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.on('error', (err) => {
  console.error('Redis Client Error:', err);
});

redisClient.connect().catch(console.error);

// Middleware to authenticate JWT token
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ 
        error: 'Access token required',
        message: 'No token provided in Authorization header'
      });
    }

    // Check if token is blacklisted
    const isBlacklisted = await redisClient.get(`blacklist:${token}`);
    if (isBlacklisted) {
      return res.status(401).json({ 
        error: 'Token invalid',
        message: 'Token has been revoked'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database
    const user = await User.findById(decoded.userId).select('-password');
    if (!user) {
      return res.status(401).json({ 
        error: 'User not found',
        message: 'User associated with token no longer exists'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({ 
        error: 'Account disabled',
        message: 'User account has been disabled'
      });
    }

    // Add user to request object
    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: 'Invalid token',
        message: 'Token is malformed or invalid'
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token expired',
        message: 'Access token has expired'
      });
    }
    
    console.error('Authentication error:', error);
    return res.status(500).json({ 
      error: 'Authentication failed',
      message: 'Internal server error during authentication'
    });
  }
};

// Middleware to check if user has required role
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        message: 'User must be authenticated'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        message: 'User does not have required role'
      });
    }

    next();
  };
};

// Middleware to check subscription status
const requireSubscription = (requiredPlan = 'free') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        message: 'User must be authenticated'
      });
    }

    const planHierarchy = {
      'free': 0,
      'basic': 1,
      'premium': 2,
      'enterprise': 3
    };

    const userPlanLevel = planHierarchy[req.user.subscription?.plan || 'free'];
    const requiredPlanLevel = planHierarchy[requiredPlan];

    if (userPlanLevel < requiredPlanLevel) {
      return res.status(403).json({ 
        error: 'Subscription required',
        message: `${requiredPlan} subscription required for this feature`
      });
    }

    if (!req.user.subscription?.isActive) {
      return res.status(403).json({ 
        error: 'Subscription inactive',
        message: 'Active subscription required for this feature'
      });
    }

    next();
  };
};

// Middleware to check if user is the owner or admin
const requireOwnership = (paramName = 'userId') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        message: 'User must be authenticated'
      });
    }

    const targetUserId = req.params[paramName] || req.body[paramName];
    
    if (req.user.role === 'admin') {
      return next(); // Admins can access any user's data
    }

    if (req.user._id.toString() !== targetUserId) {
      return res.status(403).json({ 
        error: 'Access denied',
        message: 'You can only access your own data'
      });
    }

    next();
  };
};

// Function to blacklist token (for logout)
const blacklistToken = async (token, expiresIn) => {
  try {
    const decoded = jwt.decode(token);
    const timeToExpiry = decoded.exp * 1000 - Date.now();
    
    if (timeToExpiry > 0) {
      await redisClient.setEx(`blacklist:${token}`, Math.floor(timeToExpiry / 1000), 'true');
    }
  } catch (error) {
    console.error('Error blacklisting token:', error);
  }
};

// Function to generate JWT token
const generateToken = (userId, role) => {
  const payload = {
    userId,
    role,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24) // 24 hours
  };

  return jwt.sign(payload, process.env.JWT_SECRET);
};

// Function to generate refresh token
const generateRefreshToken = (userId) => {
  const payload = {
    userId,
    type: 'refresh',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 7) // 7 days
  };

  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET);
};

module.exports = {
  authenticateToken,
  requireRole,
  requireSubscription,
  requireOwnership,
  blacklistToken,
  generateToken,
  generateRefreshToken,
  redisClient
};
