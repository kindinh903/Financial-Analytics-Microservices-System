const axios = require('axios');

const BASE_URL = 'http://localhost:8087';

async function testAuthService() {
  console.log('🧪 Testing Authentication Service...\n');

  try {
    // Test 1: Health Check
    console.log('1. Testing Health Check...');
    const healthResponse = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Health Check:', healthResponse.data);
    console.log('');

    // Test 2: Register User
    console.log('2. Testing User Registration...');
    const registerData = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'TestPass123',
      firstName: 'Test',
      lastName: 'User'
    };

    const registerResponse = await axios.post(`${BASE_URL}/api/auth/register`, registerData);
    console.log('✅ Registration successful:', {
      userId: registerResponse.data.user.id,
      username: registerResponse.data.user.username,
      email: registerResponse.data.user.email
    });
    console.log('');

    // Test 3: Login User
    console.log('3. Testing User Login...');
    const loginData = {
      identifier: 'testuser',
      password: 'TestPass123'
    };

    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, loginData);
    const { accessToken, refreshToken } = loginResponse.data.tokens;
    console.log('✅ Login successful:', {
      username: loginResponse.data.user.username,
      role: loginResponse.data.user.role,
      hasAccessToken: !!accessToken,
      hasRefreshToken: !!refreshToken
    });
    console.log('');

    // Test 4: Get Current User (Protected Route)
    console.log('4. Testing Protected Route...');
    const meResponse = await axios.get(`${BASE_URL}/api/auth/me`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    console.log('✅ Protected route successful:', {
      username: meResponse.data.user.username,
      email: meResponse.data.user.email
    });
    console.log('');

    // Test 5: Update User Preferences
    console.log('5. Testing User Preferences Update...');
    const preferencesData = {
      preferences: {
        theme: 'dark',
        timezone: 'UTC',
        currency: 'USD',
        notifications: {
          email: true,
          push: true,
          sms: false
        }
      }
    };

    const preferencesResponse = await axios.put(`${BASE_URL}/api/users/preferences`, preferencesData, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    console.log('✅ Preferences updated:', preferencesResponse.data.user.preferences);
    console.log('');

    // Test 6: Get User Profile
    console.log('6. Testing Get User Profile...');
    const profileResponse = await axios.get(`${BASE_URL}/api/users/profile`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    console.log('✅ Profile retrieved:', {
      fullName: profileResponse.data.user.firstName + ' ' + profileResponse.data.user.lastName,
      role: profileResponse.data.user.role,
      subscription: profileResponse.data.user.subscription.plan
    });
    console.log('');

    // Test 7: Refresh Token
    console.log('7. Testing Token Refresh...');
    const refreshResponse = await axios.post(`${BASE_URL}/api/auth/refresh`, {
      refreshToken: refreshToken
    });
    console.log('✅ Token refresh successful:', {
      hasNewAccessToken: !!refreshResponse.data.tokens.accessToken,
      hasNewRefreshToken: !!refreshResponse.data.tokens.refreshToken
    });
    console.log('');

    // Test 8: Logout
    console.log('8. Testing Logout...');
    const logoutResponse = await axios.post(`${BASE_URL}/api/auth/logout`, {}, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    console.log('✅ Logout successful:', logoutResponse.data.message);
    console.log('');

    console.log('🎉 All tests passed! Authentication service is working correctly.');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
}

// Run the test
testAuthService();
