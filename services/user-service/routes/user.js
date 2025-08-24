const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { 
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

// Get user profile (current user)
router.get('/me', async (req, res) => {
  try {
    // Find user by auth ID from JWT token
    const user = await User.findByAuthId(req.user._id);
    
    if (!user) {
      return res.status(404).json({
        error: 'Profile not found',
        message: 'User profile does not exist. Please complete your profile setup.'
      });
    }

    res.json({
      user
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      error: 'Failed to get profile',
      message: 'Internal server error'
    });
  }
});

// Create/Update user profile (current user)
router.put('/me', validateProfileUpdate, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Please check your input',
        details: errors.array()
      });
    }

    const { firstName, lastName, email, bio, phoneNumber, dateOfBirth, address } = req.body;
    
    // Try to find existing profile
    let user = await User.findByAuthId(req.user._id);
    
    if (!user) {
      // Create new profile if doesn't exist
      user = new User({
        authUserId: req.user._id,
        firstName: firstName || 'User',
        lastName: lastName || 'Name',
        email: email || req.user.email || 'user@example.com',
        username: req.user.username || `user_${Date.now()}`,
        role: req.user.role,
        bio,
        phoneNumber,
        dateOfBirth,
        address
      });
    } else {
      // Update existing profile
      const updates = {};
      if (firstName) updates.firstName = firstName;
      if (lastName) updates.lastName = lastName;
      if (email && email !== user.email) {
        // Check if email is already taken
        const existingUser = await User.findOne({ email, _id: { $ne: user._id } });
        if (existingUser) {
          return res.status(409).json({
            error: 'Email already taken',
            message: 'This email is already registered'
          });
        }
        updates.email = email;
      }
      if (bio !== undefined) updates.bio = bio;
      if (phoneNumber !== undefined) updates.phoneNumber = phoneNumber;
      if (dateOfBirth !== undefined) updates.dateOfBirth = dateOfBirth;
      if (address) updates.address = address;
      
      Object.assign(user, updates);
    }

    await user.save();

    res.json({
      message: 'Profile updated successfully',
      user
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      error: 'Failed to update profile',
      message: 'Internal server error'
    });
  }
});

// Update user preferences
router.put('/me/preferences', validatePreferences, async (req, res) => {
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
    
    let user = await User.findByAuthId(req.user._id);
    if (!user) {
      return res.status(404).json({
        error: 'Profile not found',
        message: 'Please create your profile first'
      });
    }

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
      user._id,
      updates,
      { new: true, runValidators: true }
    );

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
router.get('/me/subscription', async (req, res) => {
  try {
    const user = await User.findByAuthId(req.user._id);
    
    if (!user) {
      return res.status(404).json({
        error: 'Profile not found',
        message: 'Please create your profile first'
      });
    }
    
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
router.put('/subscription/:userId', requireRole(['admin']), [
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
router.get('/', requireRole(['admin']), async (req, res) => {
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
router.get('/:userId', requireRole(['admin']), async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId);
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
router.put('/:userId', requireRole(['admin']), validateProfileUpdate, async (req, res) => {
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
    const { firstName, lastName, email, role, isActive, bio, phoneNumber, dateOfBirth, address } = req.body;
    
    const updates = {};
    if (firstName) updates.firstName = firstName;
    if (lastName) updates.lastName = lastName;
    if (email) updates.email = email;
    if (role) updates.role = role;
    if (isActive !== undefined) updates.isActive = isActive;
    if (bio !== undefined) updates.bio = bio;
    if (phoneNumber !== undefined) updates.phoneNumber = phoneNumber;
    if (dateOfBirth !== undefined) updates.dateOfBirth = dateOfBirth;
    if (address) updates.address = address;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updates,
      { new: true, runValidators: true }
    );

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
router.delete('/:userId', requireRole(['admin']), async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Prevent admin from deleting themselves
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'User does not exist'
      });
    }

    if (user.authUserId === req.user._id) {
      return res.status(400).json({
        error: 'Cannot delete own account',
        message: 'You cannot delete your own account'
      });
    }

    await User.findByIdAndDelete(userId);

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