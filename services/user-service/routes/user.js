const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { 
  authenticateToken,
  requireRole, 
  requireOwnership 
} = require('../middleware/auth');

const { publishUserUpdate } = require('../kafkaPublisher');
const { AuthServiceClient } = require('../services/authServiceClient');
const router = express.Router();

// Initialize gRPC client
const authClient = new AuthServiceClient();

// Validation middleware
const validateProfileUpdate = [
  body('firstName')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name must be between 1 and 50 characters'),
  body('lastName')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name must be between 1 and 50 characters'),
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('bio')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Bio cannot exceed 500 characters'),
  body('phoneNumber')
    .optional()
    .isMobilePhone()
    .withMessage('Please provide a valid phone number')
];

const validatePreferences = [
  body('preferences.theme')
    .optional()
    .isIn(['light', 'dark'])
    .withMessage('Theme must be either light or dark'),
  body('preferences.timezone')
    .optional()
    .isString()
    .withMessage('Timezone must be a string'),
  body('preferences.currency')
    .optional()
    .isString()
    .withMessage('Currency must be a string'),
  body('preferences.notifications.email')
    .optional()
    .isBoolean()
    .withMessage('Email notifications must be a boolean'),
  body('preferences.notifications.push')
    .optional()
    .isBoolean()
    .withMessage('Push notifications must be a boolean'),
  body('preferences.notifications.sms')
    .optional()
    .isBoolean()
    .withMessage('SMS notifications must be a boolean')
];

// ==================== ADMIN ENDPOINTS (MUST COME FIRST) ====================

// Test route
router.get('/admin/test', (req, res) => {
  res.json({ message: 'Admin test route works!' });
});

// GET /api/user/admin/users - Get all users (admin only)
router.get('/admin/users', requireRole(['admin']), async (req, res) => {
  try {
    const { page = 1, limit = 10, search, role, isActive } = req.query;
    console.log('Admin users request params:', { page, limit, search, role, isActive });
    
    const query = {};

    // Build search query
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    if (role) {
      query.role = role;
    }

    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    
    console.log('Query params:', { pageNum, limitNum, skip, query });

    const users = await User.find(query)
      .select('-__v')
      .sort({ createdAt: -1 })
      .limit(limitNum)
      .skip(skip);

    const total = await User.countDocuments(query);
    const pages = Math.ceil(total / limitNum);

    console.log('Query results:', { 
      usersCount: users.length, 
      total, 
      pages, 
      currentPage: pageNum 
    });

    res.json({
      success: true,
      users,
      pagination: {
        current: pageNum,
        pages: pages,
        total: total
      }
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      error: 'Failed to fetch users',
      message: error.message
    });
  }
});

// GET /api/user/admin/users/:id - Get user by ID (admin only)
router.get('/admin/users/:id', requireRole(['admin']), async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-__v');
    
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'The requested user does not exist'
      });
    }

    res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({
      error: 'Failed to fetch user',
      message: error.message
    });
  }
});

// PUT /api/user/admin/users/:id - Update user (admin only)
router.put('/admin/users/:id', requireRole(['admin']), async (req, res) => {
  try {
    const { firstName, lastName, email, role, isActive, permissions, features } = req.body;
    
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'The requested user does not exist'
      });
    }

    // Update user fields
    if (firstName !== undefined) user.firstName = firstName;
    if (lastName !== undefined) user.lastName = lastName;
    if (email !== undefined) user.email = email;
    if (role !== undefined) user.role = role;
    if (isActive !== undefined) user.isActive = isActive;
    if (permissions !== undefined) user.permissions = permissions;
    if (features !== undefined) user.features = features;
    
    user.updatedAt = new Date();
    await user.save();
    publishUserUpdate(user);
    console.log('User updated by admin:', user);
    
    res.json({
      success: true,
      message: 'User updated successfully',
      user
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      error: 'Failed to update user',
      message: error.message
    });
  }
});

// POST /api/user/admin/users - Create user (admin only)
router.post('/admin/users', requireRole(['admin']), async (req, res) => {
  try {
    const { authUserId, firstName, lastName, email, role, permissions, features } = req.body;
    
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        error: 'User already exists',
        message: 'A user with this email already exists'
      });
    }

    const user = new User({
      authUserId,
      firstName,
      lastName,
      email,
      role: role || 'user',
      permissions: permissions || ['free'],
      features: features || ['basic-dashboard', 'news'],
      isActive: true,
      preferences: {
        theme: 'light',
        timezone: 'UTC',
        currency: 'USD',
        notifications: {
          email: true,
          push: true,
          sms: false
        }
      },
      subscription: {
        plan: 'free',
        isActive: true,
        startDate: new Date(),
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      }
    });

    await user.save();

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      error: 'Failed to create user',
      message: error.message
    });
  }
});

// DELETE /api/user/admin/users/:id - Delete user (admin only)
router.delete('/admin/users/:id', requireRole(['admin']), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'The requested user does not exist'
      });
    }

    let authServiceResponse = null;
    let authServiceError = null;

    // Call auth-service to delete user account and tokens via gRPC
    if (user.authUserId) {
      try {
        console.log(`Calling auth-service to delete user: ${user.authUserId}`);
        authServiceResponse = await authClient.deleteUser(
          user.authUserId,
          req.user.authUserId,
          'Deleted by admin via user-service'
        );
        
        if (authServiceResponse.success) {
          console.log(`Successfully deleted user from auth-service. Tokens deleted: ${authServiceResponse.deleted_tokens_count}`);
        } else {
          console.error('Failed to delete user from auth-service:', authServiceResponse.message);
          authServiceError = authServiceResponse.message;
        }
      } catch (grpcError) {
        console.error('gRPC error calling auth-service:', grpcError);
        authServiceError = grpcError.message || 'gRPC call failed';
        // Continue with user-service deletion even if auth-service fails
      }
    } else {
      console.warn('User has no authUserId, skipping auth-service deletion');
    }

    // Delete user from user-service database
    await User.findByIdAndDelete(req.params.id);

    const response = {
      success: true,
      message: 'User deleted successfully from user-service',
      user: {
        id: user._id,
        authUserId: user.authUserId,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName
      }
    };

    // Include auth-service response info
    if (authServiceResponse) {
      response.auth_service = {
        success: authServiceResponse.success,
        message: authServiceResponse.message,
        deleted_tokens_count: authServiceResponse.deleted_tokens_count
      };
    } else if (authServiceError) {
      response.auth_service = {
        success: false,
        error: authServiceError,
        note: 'User deleted from user-service despite auth-service failure'
      };
    }

    res.json(response);
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      error: 'Failed to delete user',
      message: error.message
    });
  }
});

// GET /api/user/admin/stats - Get admin statistics
router.get('/admin/stats', requireRole(['admin']), async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const adminUsers = await User.countDocuments({ role: 'admin' });
    const premiumUsers = await User.countDocuments({ role: 'premium' });
    const freeUsers = await User.countDocuments({ role: 'user' });

    res.json({
      success: true,
      stats: {
        totalUsers,
        activeUsers,
        inactiveUsers: totalUsers - activeUsers,
        adminUsers,
        premiumUsers,
        freeUsers
      }
    });
  } catch (error) {
    console.error('Get admin stats error:', error);
    res.status(500).json({
      error: 'Failed to fetch statistics',
      message: error.message
    });
  }
});

// GET /api/user/admin/logs - Get system logs (placeholder)
router.get('/admin/logs', requireRole(['admin']), async (req, res) => {
  try {
    const { page = 1, limit = 50, level, service } = req.query;
    
    // This is a placeholder - in a real system, you'd query your logging system
    const logs = [
      {
        id: 1,
        timestamp: new Date().toISOString(),
        level: 'INFO',
        service: 'user-service',
        message: 'User login successful',
        userId: 'aa0ff2d5-58c6-442b-bebe-b4bbc4914485'
      },
      {
        id: 2,
        timestamp: new Date(Date.now() - 60000).toISOString(),
        level: 'WARN',
        service: 'auth-service',
        message: 'Failed login attempt',
        userId: null
      }
    ];

    res.json({
      success: true,
      logs,
      pagination: {
        current: parseInt(page),
        pages: 1,
        total: logs.length
      }
    });
  } catch (error) {
    console.error('Get admin logs error:', error);
    res.status(500).json({
      error: 'Failed to fetch logs',
      message: error.message
    });
  }
});

// PUT /api/user/admin/settings - Update system settings (placeholder)
router.put('/admin/settings', requireRole(['admin']), async (req, res) => {
  try {
    const { maintenanceMode, registrationEnabled, maxUsers } = req.body;
    
    // This is a placeholder - in a real system, you'd update your configuration
    const settings = {
      maintenanceMode: maintenanceMode || false,
      registrationEnabled: registrationEnabled !== undefined ? registrationEnabled : true,
      maxUsers: maxUsers || 10000,
      updatedAt: new Date().toISOString(),
      updatedBy: req.user.authUserId
    };

    res.json({
      success: true,
      message: 'Settings updated successfully',
      settings
    });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({
      error: 'Failed to update settings',
      message: error.message
    });
  }
});

// ==================== REGULAR USER ENDPOINTS ====================

// Get user permissions/tier/features (for AuthService)
router.get('/:userId/permissions', requireOwnership('userId'), async (req, res) => {
  try {
    const userReq = req.user;
    const { userId } = req.params;
    const user = await User.findOne({ authUserId: userId });
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'User does not exist'
      });
    }

    res.json({
      role: user.role || 'user',
      permissions: user.permissions || ['free'],
      features: user.features || ['basic-dashboard', 'news']
    });
  } catch (error) {
    console.error('Get user permissions error:', error);
    res.status(500).json({
      error: 'Failed to get permissions',
      message: 'Internal server error'
    });
  }
});

// Get user profile
router.get('/profile', async (req, res) => {
  try {
    const userId = req.user.authUserId;
    console.log('Fetching profile for userId:', userId);
    // ✅ Sửa: tìm theo authUserId thay vì _id
    const user = await User.findOne({ authUserId: userId });
    console.log('Fetched user profile:', user);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      user: user
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// PUT /api/user/profile - Update user profile
// PUT /api/user/profile - Update user profile
router.put('/profile', validateProfileUpdate, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const userId = req.user.authUserId;
    const { firstName, lastName, email, bio, phoneNumber } = req.body;

    // Check if email is already taken by another user
    if (email) {
      const existingUser = await User.findOne({ 
        email, 
        authUserId: { $ne: userId } // ✅ Sửa từ _id thành authUserId
      });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email already exists'
        });
      }
    }

    // PUT /api/user/profile
    const user = await User.findOneAndUpdate(
      { authUserId: userId }, // ✅ Sửa
      {
        ...(firstName && { firstName }),
        ...(lastName && { lastName }),
        ...(email && { email }),
        ...(bio && { bio }),
        ...(phoneNumber && { phoneNumber }),
        updatedAt: new Date()
      },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: user
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Update user preferences
router.put('/preferences', validatePreferences, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const user = await User.findOne({ authUserId: req.user.authUserId });
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'User profile not found'
      });
    }

    // Update preferences
    if (req.body.preferences) {
      user.preferences = { ...user.preferences, ...req.body.preferences };
    }
    
    user.updatedAt = new Date();
    await user.save();

    res.json({
      success: true,
      message: 'Preferences updated successfully',
      preferences: user.preferences
    });
  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({
      error: 'Failed to update preferences',
      message: error.message
    });
  }
});

// Get user portfolio
router.get('/portfolio', async (req, res) => {
  try {
    const user = await User.findOne({ authUserId: req.user.authUserId });
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'User profile not found'
      });
    }

    res.json({
      success: true,
      portfolio: user.portfolio || []
    });
  } catch (error) {
    console.error('Get portfolio error:', error);
    res.status(500).json({
      error: 'Failed to fetch portfolio',
      message: error.message
    });
  }
});

// Add to portfolio
router.post('/portfolio', async (req, res) => {
  try {
    const { symbol, quantity, purchasePrice, purchaseDate } = req.body;
    
    if (!symbol || !quantity || !purchasePrice) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Symbol, quantity, and purchase price are required'
      });
    }

    const user = await User.findOne({ authUserId: req.user.authUserId });
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'User profile not found'
      });
    }

    const portfolioItem = {
      symbol,
      quantity: parseFloat(quantity),
      purchasePrice: parseFloat(purchasePrice),
      purchaseDate: purchaseDate || new Date(),
      addedAt: new Date()
    };

    if (!user.portfolio) {
      user.portfolio = [];
    }
    
    user.portfolio.push(portfolioItem);
    user.updatedAt = new Date();
    await user.save();

    res.status(201).json({
      success: true,
      message: 'Item added to portfolio successfully',
      portfolio: user.portfolio
    });
  } catch (error) {
    console.error('Add to portfolio error:', error);
    res.status(500).json({
      error: 'Failed to add to portfolio',
      message: error.message
    });
  }
});

module.exports = router;
