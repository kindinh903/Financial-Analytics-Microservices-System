import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout/Layout';
import Dashboard from './pages/Dashboard';
import Charts from './pages/Charts';
import Portfolio from './pages/Portfolio';
import News from './pages/News';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/charts" element={<Charts />} />
          <Route path="/portfolio" element={<Portfolio />} />
          <Route path="/news" element={<News />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App; 