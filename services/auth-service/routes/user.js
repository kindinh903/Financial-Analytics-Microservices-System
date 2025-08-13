const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { 
  authenticateToken, 
  requireRole, 
  requireOwnership,
  requireSubscription 
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
    .withMessage('Please provide a valid email address')
];

const validatePasswordChange = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain at least one lowercase letter, one uppercase letter, and one number')
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

// Get user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    res.json({
      user: req.user
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      error: 'Failed to get profile',
      message: 'Internal server error'
    });
  }
});

// Update user profile
router.put('/profile', authenticateToken, validateProfileUpdate, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Please check your input',
        details: errors.array()
      });
    }

    const { firstName, lastName, email } = req.body;
    const updates = {};

    if (firstName) updates.firstName = firstName;
    if (lastName) updates.lastName = lastName;
    if (email && email !== req.user.email) {
      // Check if email is already taken
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(409).json({
          error: 'Email already taken',
          message: 'This email is already registered'
        });
      }
      updates.email = email;
      updates.isEmailVerified = false; // Require re-verification
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      updates,
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      message: 'Profile updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      error: 'Failed to update profile',
      message: 'Internal server error'
    });
  }
});

// Change password
router.put('/change-password', authenticateToken, validatePasswordChange, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Please check your input',
        details: errors.array()
      });
    }

    const { currentPassword, newPassword } = req.body;

    // Verify current password
    const user = await User.findById(req.user._id);
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    
    if (!isCurrentPasswordValid) {
      return res.status(401).json({
        error: 'Invalid current password',
        message: 'Current password is incorrect'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      error: 'Failed to change password',
      message: 'Internal server error'
    });
  }
});

// Update user preferences
router.put('/preferences', authenticateToken, validatePreferences, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Please check your input',
        details: errors.array()
      });
    }

    const { preferences } = req.body;
    const updates = {};

    if (preferences.theme) updates['preferences.theme'] = preferences.theme;
    if (preferences.timezone) updates['preferences.timezone'] = preferences.timezone;
    if (preferences.currency) updates['preferences.currency'] = preferences.currency;
    if (preferences.notifications) {
      if (preferences.notifications.email !== undefined) {
        updates['preferences.notifications.email'] = preferences.notifications.email;
      }
      if (preferences.notifications.push !== undefined) {
        updates['preferences.notifications.push'] = preferences.notifications.push;
      }
      if (preferences.notifications.sms !== undefined) {
        updates['preferences.notifications.sms'] = preferences.notifications.sms;
      }
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      updates,
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      message: 'Preferences updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({
      error: 'Failed to update preferences',
      message: 'Internal server error'
    });
  }
});

// Get subscription info
router.get('/subscription', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('subscription');
    
    res.json({
      subscription: user.subscription
    });
  } catch (error) {
    console.error('Get subscription error:', error);
    res.status(500).json({
      error: 'Failed to get subscription',
      message: 'Internal server error'
    });
  }
});

// Update subscription (admin only)
router.put('/subscription/:userId', authenticateToken, requireRole(['admin']), [
  body('plan').isIn(['free', 'basic', 'premium', 'enterprise']),
  body('isActive').isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Please check your input',
        details: errors.array()
      });
    }

    const { userId } = req.params;
    const { plan, isActive } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'User does not exist'
      });
    }

    user.subscription.plan = plan;
    user.subscription.isActive = isActive;
    user.subscription.startDate = new Date();
    user.subscription.endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    await user.save();

    res.json({
      message: 'Subscription updated successfully',
      subscription: user.subscription
    });
  } catch (error) {
    console.error('Update subscription error:', error);
    res.status(500).json({
      error: 'Failed to update subscription',
      message: 'Internal server error'
    });
  }
});

// Get all users (admin only)
router.get('/', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { page = 1, limit = 10, search, role, isActive } = req.query;
    
    const query = {};
    
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (role) query.role = role;
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const users = await User.find(query)
      .select('-password')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(query);

    res.json({
      users,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      error: 'Failed to get users',
      message: 'Internal server error'
    });
  }
});

// Get user by ID (admin only)
router.get('/:userId', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId).select('-password');
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'User does not exist'
      });
    }

    res.json({
      user
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      error: 'Failed to get user',
      message: 'Internal server error'
    });
  }
});

// Update user (admin only)
router.put('/:userId', authenticateToken, requireRole(['admin']), validateProfileUpdate, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Please check your input',
        details: errors.array()
      });
    }

    const { userId } = req.params;
    const { firstName, lastName, email, role, isActive } = req.body;
    
    const updates = {};
    if (firstName) updates.firstName = firstName;
    if (lastName) updates.lastName = lastName;
    if (email) updates.email = email;
    if (role) updates.role = role;
    if (isActive !== undefined) updates.isActive = isActive;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updates,
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedUser) {
      return res.status(404).json({
        error: 'User not found',
        message: 'User does not exist'
      });
    }

    res.json({
      message: 'User updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      error: 'Failed to update user',
      message: 'Internal server error'
    });
  }
});

// Delete user (admin only)
router.delete('/:userId', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Prevent admin from deleting themselves
    if (userId === req.user._id.toString()) {
      return res.status(400).json({
        error: 'Cannot delete own account',
        message: 'You cannot delete your own account'
      });
    }

    const user = await User.findByIdAndDelete(userId);
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'User does not exist'
      });
    }

    res.json({
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      error: 'Failed to delete user',
      message: 'Internal server error'
    });
  }
});

module.exports = router;
