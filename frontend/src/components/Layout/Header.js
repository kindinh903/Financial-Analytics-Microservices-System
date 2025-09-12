import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

const Header = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Get user from localStorage
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const navItems = [
    { path: '/', label: 'Dashboard', icon: '📊' },
    { path: '/charts', label: 'Charts', icon: '📈' },
    { path: '/news', label: 'News', icon: '📰' },
    { path: '/backtest', label: 'Backtest', icon: '🔬' },
  ];

  // Add admin nav item if user is admin
  if (user?.role === 'admin') {
    navItems.push({ path: '/admin', label: 'Admin Panel', icon: '⚙️' });
  }

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <span className="text-white text-lg font-bold">F</span>
              </div>
              <span className="text-xl font-bold text-gray-900">Financial Analytics</span>
            </Link>
          </div>
          
          <nav className="hidden md:flex space-x-8">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  location.pathname === item.path
                    ? 'text-primary-600 bg-primary-50'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>

          <div className="flex items-center space-x-4">
            <button className="p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 rounded-md">
              <span className="sr-only">Notifications</span>
              🔔
            </button>
            
            {user ? (
              // Đã đăng nhập - hiển thị profile và logout
              <div className="flex items-center space-x-3">
                <Link 
                  to="/profile" 
                  className="flex items-center space-x-2 text-sm text-gray-700 hover:text-gray-900"
                >
                  <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                    <span className="text-xs font-medium">
                      {user.firstName?.[0]}{user.lastName?.[0]}
                    </span>
                  </div>
                  <span className="hidden md:block">
                    {user.firstName} {user.lastName}
                  </span>
                  {user.role === 'admin' && (
                    <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">
                      Admin
                    </span>
                  )}
                </Link>
                
                <button 
                  onClick={handleLogout}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Logout
                </button>
              </div>
            ) : (
              // Chưa đăng nhập - hiển thị nút login/register
              <div className="flex items-center space-x-3">
                <Link 
                  to="/login"
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Login
                </Link>
                <Link 
                  to="/register"
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;