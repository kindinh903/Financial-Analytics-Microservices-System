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
        }
      } catch (error) {
        console.error('Error parsing user data:', error);
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

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
