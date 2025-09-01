import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import TradingInterface from './pages/TradingInterface';
import Dashboard from './pages/Dashboard';
import Charts from './pages/Charts';
import Portfolio from './pages/Portfolio';
import News from './pages/News';
import Layout from './components/Layout/Layout';
import Login from './pages/Login';
import Register from './pages/Register';


function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<TradingInterface />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<Layout><Dashboard /></Layout>} />
        <Route path="/charts" element={<Layout><Charts /></Layout>} />
        <Route path="/portfolio" element={<Layout><Portfolio /></Layout>} />
        <Route path="/news" element={<Layout><News /></Layout>} />
      </Routes>
    </Router>
  );
}

export default App; 