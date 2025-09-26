import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import Portfolio from './pages/Portfolio';
import News from './pages/News';
import Layout from './components/Layout/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile'; // Thêm dòng này
import AdminPanel from './pages/AdminPanel';
import HomePage from './pages/HomePage';
import Backtest from './pages/Backtest';
import BacktestResults from './pages/BacktestResults';
import BacktestHistory from './pages/BacktestHistory';


function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
          <Router>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/profile" element={<Layout><Profile /></Layout>} />
              <Route path="/admin" element={<Layout><AdminPanel /></Layout>} />
              <Route path="/portfolio" element={<Layout><Portfolio /></Layout>} />
              <Route path="/news" element={<Layout><News /></Layout>} />
              <Route path="/backtest" element={<Layout><Backtest /></Layout>} />
              <Route path="/backtest/history" element={<Layout><BacktestHistory /></Layout>} />
              <Route path="/backtest/results/:id" element={<Layout><BacktestResults /></Layout>} />
            </Routes>
          </Router>
        </div>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;