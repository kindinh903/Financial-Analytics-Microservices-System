import React, { createContext, useContext, useState, useEffect } from 'react';
import { tokenManager } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Kiểm tra user data trong localStorage khi app khởi động
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        
        // Kiểm tra xem có access token trong memory không
        if (tokenManager.hasAccessToken()) {
          setIsAuthenticated(true);
          setLoading(false);
        } else {
          // ✅ FIX: Access token không có trong memory → Tự động refresh
          console.log('Access token not found in memory, attempting auto-refresh...');
          attemptAutoRefresh();
        }
      } catch (error) {
        console.error('Error parsing user data:', error);
        localStorage.removeItem('user');
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, []);

  // ✅ FIX: Function để tự động refresh token
  const attemptAutoRefresh = async () => {
    try {
      console.log('Attempting to refresh token on app startup...');
      
      // Import api dynamically để tránh circular dependency
      const { authService } = await import('../services/api');
      const refreshResponse = await authService.refreshToken();
      
      if (refreshResponse.data.accessToken) {
        console.log('Auto-refresh successful, user is authenticated');
        tokenManager.setAccessToken(refreshResponse.data.accessToken);
        setIsAuthenticated(true);
      } else {
        console.log('Auto-refresh failed: No access token in response');
        logout();
      }
    } catch (error) {
      console.log('Auto-refresh failed:', error.message);
      // Refresh thất bại → Clear data và redirect to login
      logout();
    } finally {
      setLoading(false);
    }
  };

  // Effect để theo dõi thay đổi token
  useEffect(() => {
    const handleTokenChange = (token) => {
      const userData = localStorage.getItem('user');
      
      if (token && userData && !isAuthenticated) {
        // Có token và user data nhưng chưa authenticated -> set authenticated
        try {
          const parsedUser = JSON.parse(userData);
          setUser(parsedUser);
          setIsAuthenticated(true);
        } catch (error) {
          console.error('Error parsing user data:', error);
          localStorage.removeItem('user');
        }
      } else if (!token && isAuthenticated) {
        // Không có token nhưng vẫn authenticated -> logout
        setIsAuthenticated(false);
      }
    };

    // Listen to token changes
    tokenManager.addListener(handleTokenChange);
    
    // Check ngay khi mount
    handleTokenChange(tokenManager.getAccessToken());
    
    return () => {
      tokenManager.removeListener(handleTokenChange);
    };
  }, [isAuthenticated]);

  const login = (userData, accessToken) => {
    // Lưu user info vào localStorage
    localStorage.setItem('user', JSON.stringify(userData));
    
    // Lưu access token vào memory
    tokenManager.setAccessToken(accessToken);
    
    // Update state
    setUser(userData);
    setIsAuthenticated(true);
  };

  const logout = () => {
    // Clear token from memory
    tokenManager.clearAccessToken();
    
    // Clear user data from localStorage
    localStorage.removeItem('user');
    
    // Update state
    setUser(null);
    setIsAuthenticated(false);
  };

  const updateUser = (userData) => {
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const refreshAccessToken = (newAccessToken) => {
    // Cập nhật access token mới trong memory
    tokenManager.setAccessToken(newAccessToken);
    // Không cần update state vì user data không thay đổi
  };

  const value = {
    user,
    isAuthenticated,
    loading,
    login,
    logout,
    updateUser,
    refreshAccessToken,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
