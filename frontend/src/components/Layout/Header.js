import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Header = () => {
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Dashboard', icon: '📊' },
    { path: '/charts', label: 'Charts', icon: '📈' },
    { path: '/portfolio', label: 'Portfolio', icon: '💼' },
    { path: '/news', label: 'News', icon: '📰' },
  ];

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
            <button className="p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 rounded-md">
              <span className="sr-only">Settings</span>
              ⚙️
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header; 