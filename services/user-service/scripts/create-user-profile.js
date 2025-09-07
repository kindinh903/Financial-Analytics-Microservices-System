const mongoose = require('mongoose');
const User = require('../models/User');

// MongoDB connection
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/user_management';
    await mongoose.connect(mongoURI);
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Create user profile for existing auth user
const createUserProfile = async () => {
  try {
    const userData = {
      authUserId: 'aa0ff2d5-58c6-442b-bebe-b4bbc4914485', // From the auth service response
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      role: 'admin', // Make this user an admin
      permissions: ['admin', 'premium', 'free'],
      features: ['admin-panel', 'advanced-charts', 'premium-news', 'basic-dashboard', 'news'],
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
        plan: 'enterprise',
        isActive: true,
        startDate: new Date(),
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year from now
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Check if user already exists
    const existingUser = await User.findOne({ email: userData.email });
    if (existingUser) {
      console.log('User already exists, updating to admin...');
      existingUser.role = 'admin';
      existingUser.permissions = userData.permissions;
      existingUser.features = userData.features;
      existingUser.updatedAt = new Date();
      await existingUser.save();
      console.log('✅ User updated to admin successfully!');
    } else {
      // Create new user profile
      const user = new User(userData);
      await user.save();
      console.log('✅ User profile created successfully!');
    }
    
    console.log('📧 Email:', userData.email);
    console.log('🔑 Role:', userData.role);
    console.log('🎯 Permissions:', userData.permissions);
    console.log('✨ Features:', userData.features);
    
  } catch (error) {
    console.error('❌ Error creating user profile:', error);
  }
};

// Main function
const main = async () => {
  try {
    await connectDB();
    await createUserProfile();
    console.log('Script completed successfully');
  } catch (error) {
    console.error('Script failed:', error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
};

// Run the script
if (require.main === module) {
  main();
}

module.exports = { createUserProfile };
