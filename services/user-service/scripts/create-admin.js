const mongoose = require('mongoose');
const User = require('../models/User');

// MongoDB connection
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/financial_analytics';
    await mongoose.connect(mongoURI);
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Create admin user
const createAdminUser = async () => {
  try {
    const adminData = {
      authUserId: `admin_${Date.now()}`,
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@example.com',
      role: 'admin',
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
      }
    };

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: adminData.email });
    if (existingAdmin) {
      console.log('Admin user already exists:', existingAdmin.email);
      return existingAdmin;
    }

    // Create new admin user
    const adminUser = new User(adminData);
    await adminUser.save();
    
    console.log('Admin user created successfully:');
    console.log('Email:', adminUser.email);
    console.log('Role:', adminUser.role);
    console.log('Auth User ID:', adminUser.authUserId);
    console.log('Permissions:', adminUser.permissions);
    console.log('Features:', adminUser.features);
    
    return adminUser;
  } catch (error) {
    console.error('Error creating admin user:', error);
    throw error;
  }
};

// Main function
const main = async () => {
  try {
    await connectDB();
    await createAdminUser();
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

module.exports = { createAdminUser };
