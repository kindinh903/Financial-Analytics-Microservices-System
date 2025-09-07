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

// Update existing user to admin
const updateUserToAdmin = async () => {
  try {
    const email = 'test@example.com';
    
    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (!existingUser) {
      console.log('❌ User not found:', email);
      return;
    }

    console.log('Found user:', existingUser.email, 'Current role:', existingUser.role);

    // Update user to admin
    const updateData = {
      role: 'admin',
      permissions: ['admin', 'premium', 'free'],
      features: ['admin-panel', 'advanced-charts', 'premium-news', 'basic-dashboard', 'news'],
      updatedAt: new Date()
    };

    const result = await User.updateOne({ email }, { $set: updateData });
    
    console.log('✅ User updated to admin successfully!');
    console.log('📧 Email:', email);
    console.log('🔑 Role: admin');
    console.log('🎯 Permissions:', updateData.permissions);
    console.log('✨ Features:', updateData.features);
    console.log('Update result:', result);
    
    // Verify the update
    const updatedUser = await User.findOne({ email });
    console.log('Updated user:', updatedUser);
    
  } catch (error) {
    console.error('❌ Error updating user to admin:', error);
  }
};

// Main function
const main = async () => {
  try {
    await connectDB();
    await updateUserToAdmin();
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

module.exports = { updateUserToAdmin };
