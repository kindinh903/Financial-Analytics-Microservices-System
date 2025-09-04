import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Charts from './pages/Charts';
import Portfolio from './pages/Portfolio';
import News from './pages/News';
import Layout from './components/Layout/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile'; // Thêm dòng này
import HomePage from './pages/HomePage';


function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/profile" element={<Profile />} /> {/* Thêm dòng này */}
        <Route path="/dashboard" element={<Layout><Dashboard /></Layout>} />
        <Route path="/charts" element={<Layout><Charts /></Layout>} />
        <Route path="/portfolio" element={<Layout><Portfolio /></Layout>} />
        <Route path="/news" element={<Layout><News /></Layout>} />
      </Routes>
    </Router>
  );
}

export default App;