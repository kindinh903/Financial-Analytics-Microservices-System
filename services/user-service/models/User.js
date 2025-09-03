const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  // Reference to auth service user ID
  authUserId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  // Profile information
  firstName: {
    type: String,
    required: true,
    trim: true,
    maxlength: [50, 'First name cannot exceed 50 characters']
  },
  lastName: {
    type: String,
    required: true,
    trim: true,
    maxlength: [50, 'Last name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    index: true
  },
  // Role from auth service (for quick access)
  role: {
    type: String,
    enum: ['user', 'premium', 'admin'],
    default: 'user'
  },
  // Access permissions and feature flags
  permissions: {
    type: [String],
    default: ['free']
  },
  features: {
    type: [String],
    default: ['basic-dashboard', 'news']
  },
  // Account status
  isActive: {
    type: Boolean,
    default: true
  },
  // User preferences
  preferences: {
    theme: {
      type: String,
      enum: ['light', 'dark'],
      default: 'light'
    },
    timezone: {
      type: String,
      default: 'UTC'
    },
    currency: {
      type: String,
      default: 'USD'
    },
    notifications: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
      sms: { type: Boolean, default: false }
    }
  },
  // Subscription information
  subscription: {
    plan: {
      type: String,
      enum: ['free', 'basic', 'premium', 'enterprise'],
      default: 'free'
    },
    startDate: Date,
    endDate: Date,
    isActive: {
      type: Boolean,
      default: true
    }
  },
  // Portfolio information
  portfolio: [{
    symbol: {
      type: String,
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 0
    },
    avgPrice: {
      type: Number,
      required: true,
      min: 0
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  // Additional profile fields
  avatar: String,
  bio: {
    type: String,
    maxlength: [500, 'Bio cannot exceed 500 characters']
  },
  dateOfBirth: Date,
  phoneNumber: String,
  address: {
    street: String,
    city: String,
    state: String,
    country: String,
    zipCode: String
  }
}, {
  timestamps: true
});

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Method to exclude sensitive fields when converting to JSON
userSchema.methods.toJSON = function() {
  const userObject = this.toObject();
  delete userObject.__v;
  return userObject;
};

// Static method to find user by auth ID
userSchema.statics.findByAuthId = function(authId) {
  return this.findOne({ authUserId: authId });
};

// Static method to find user by email or username
userSchema.statics.findByEmailOrUsername = function(identifier) {
  return this.findOne({
    $or: [
      { email: identifier.toLowerCase() }
      // { username: identifier }
    ]
  });
};

// Add index for better performance
userSchema.index({ 'portfolio.symbol': 1 });
userSchema.index({ email: 1, isActive: 1 });

module.exports = mongoose.model('User', userSchema);