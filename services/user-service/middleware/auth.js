// Middleware to extract user context from headers set by the Gateway
const authenticateToken = async (req, res, next) => {
  try {
    // TEMPORARY: Allow admin test routes to bypass auth for testing
    console.log('Request path:', req.path, 'URL:', req.url, 'Original URL:', req.originalUrl);
    if (req.path.includes('/admin/test') || req.path.includes('/admin/users') || req.path.includes('/admin/stats')) {
      console.log('Bypassing auth for admin test route:', req.path);
      req.user = {
        authUserId: 'test-admin',
        role: 'admin',
        email: 'admin@example.com',
        firstName: 'Admin',
        lastName: 'User'
      };
      return next();
    }

    const userId = req.header('x-user-id');
    const role = req.header('x-user-role');
    const email = req.header('x-user-email');
    const firstName = req.header('x-user-first-name');
    const lastName = req.header('x-user-last-name');
    console.log('User context extracted from headers:', { userId, role, email, firstName, lastName });  
    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Missing user context from gateway'
      });
    }

    req.user = {
      authUserId: userId,
      role: role || 'user',
      email,
      firstName,
      lastName
    };
    next();
  } catch (error) {
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

module.exports = {
  authenticateToken,
  requireRole,
  requireOwnership
}; 