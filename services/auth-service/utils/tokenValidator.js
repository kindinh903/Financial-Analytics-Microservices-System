const jwt = require('jsonwebtoken');
const axios = require('axios');

class TokenValidator {
  constructor(authServiceUrl = 'http://localhost:8087') {
    this.authServiceUrl = authServiceUrl;
  }

  // Validate token by making request to auth service
  async validateToken(token) {
    try {
      const response = await axios.get(`${this.authServiceUrl}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        timeout: 5000
      });
      
      return {
        valid: true,
        user: response.data.user
      };
    } catch (error) {
      if (error.response) {
        return {
          valid: false,
          error: error.response.data.error,
          message: error.response.data.message
        };
      }
      
      return {
        valid: false,
        error: 'Service unavailable',
        message: 'Authentication service is not available'
      };
    }
  }

  // Validate token locally (for services that have JWT_SECRET)
  validateTokenLocally(token, secret) {
    try {
      const decoded = jwt.verify(token, secret);
      return {
        valid: true,
        decoded
      };
    } catch (error) {
      return {
        valid: false,
        error: error.name,
        message: error.message
      };
    }
  }

  // Extract token from Authorization header
  extractToken(authHeader) {
    if (!authHeader) return null;
    
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return null;
    }
    
    return parts[1];
  }

  // Check if user has required role
  hasRole(user, requiredRoles) {
    if (!user || !user.role) return false;
    
    if (Array.isArray(requiredRoles)) {
      return requiredRoles.includes(user.role);
    }
    
    return user.role === requiredRoles;
  }

  // Check if user has required subscription
  hasSubscription(user, requiredPlan = 'free') {
    if (!user || !user.subscription) return false;
    
    const planHierarchy = {
      'free': 0,
      'basic': 1,
      'premium': 2,
      'enterprise': 3
    };

    const userPlanLevel = planHierarchy[user.subscription.plan || 'free'];
    const requiredPlanLevel = planHierarchy[requiredPlan];

    return userPlanLevel >= requiredPlanLevel && user.subscription.isActive;
  }
}

module.exports = TokenValidator;
