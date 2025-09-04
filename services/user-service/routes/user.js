const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { 
  authenticateToken,  // ✅ Thêm middleware này
  requireRole, 
  requireOwnership 
} = require('../middleware/auth');

const router = express.Router();

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

// Get user permissions/tier/features (for AuthService)
router.get('/:userId/permissions', authenticateToken, async (req, res) => {
  try {
    const userReq = req.user; // ✅ Từ middleware authenticateToken
    const { userId } = req.params;
    if (userReq.authUserId !== userId && !userReq.role.includes('admin')) {
      console.log('User is not authorized to access this resource', userReq);
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to access this resource'
      });
    }
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
    console.error('Get permissions error:', error);
    res.status(500).json({
      error: 'Failed to get permissions',
      message: 'Internal server error'
    });
  }
});
// GET /api/user/profile - Get user profile
router.get('/profile', authenticateToken, async (req, res) => {
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
router.put('/profile', authenticateToken, validateProfileUpdate, async (req, res) => {
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

// GET /api/user/portfolio - Get user portfolio
router.get('/portfolio',authenticateToken, async (req, res) => {
  try {
    const userId = req.user.authUserId ;
    // GET /api/user/portfolio  
    const user = await User.findOne({ authUserId: userId }); // ✅ Sửa
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      portfolio: user.portfolio || []
    });
  } catch (error) {
    console.error('Get portfolio error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// POST /api/user/portfolio - Add to portfolio
router.post('/portfolio', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.authUserId;
    const { symbol, quantity, price } = req.body;

    if (!symbol || quantity == null || price == null) {
      return res.status(400).json({
        success: false,
        message: 'Symbol, quantity, and price are required'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if symbol already exists in portfolio
    const existingItem = user.portfolio.find(item => item.symbol === symbol);
    
    if (existingItem) {
      // Update existing item
      existingItem.quantity += quantity;
      existingItem.avgPrice = ((existingItem.avgPrice * (existingItem.quantity - quantity)) + (price * quantity)) / existingItem.quantity;
    } else {
      // Add new item
      user.portfolio.push({
        symbol,
        quantity,
        avgPrice: price
      });
    }

    await user.save();

    res.json({
      success: true,
      message: 'Portfolio updated successfully',
      portfolio: user.portfolio
    });
  } catch (error) {
    console.error('Add to portfolio error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});


// Update user preferences

// Get subscription info

// Update subscription (admin only)

// Get all users (admin only)

// Get user by ID (admin only)

// Update user (admin only)

// Delete user (admin only)

module.exports = router;