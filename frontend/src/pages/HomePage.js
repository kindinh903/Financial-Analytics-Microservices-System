import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import MultiChartDashboard from '../components/Charts/MultiChartDashboard';

const HomePage = () => {
  const navigate = useNavigate();

  const handleProfileClick = () => {
    const accessToken = localStorage.getItem('accessToken');
    const user = JSON.parse(localStorage.getItem('user'));
    if (!accessToken) {
      navigate('/login');
    } else if (user.role === 'admin') {
      navigate('/admin/dashboard');
    } else {
      navigate('/profile');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header - Section 1 */}
      <div className="bg-white border-b px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="text-red-600 font-bold text-lg">📊 Trading Platform</div>
          <nav className="flex gap-6 text-sm">
            <Link to="/" className="text-blue-600 hover:text-blue-800 font-medium">Giao dịch</Link>
            <Link to="/dashboard" className="text-gray-600 hover:text-gray-800">Trang chủ</Link>
            <Link to="/charts" className="text-gray-600 hover:text-gray-800">Biểu đồ</Link>
            <Link to="/portfolio" className="text-gray-600 hover:text-gray-800">Danh mục</Link>
            <Link to="/news" className="text-gray-600 hover:text-gray-800">Tin tức</Link>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xl cursor-pointer hover:scale-110 transition-transform">🔔</span>
          <span className="text-xl cursor-pointer hover:scale-110 transition-transform">⚙️</span>
          <span
            className="text-xl cursor-pointer hover:scale-110 transition-transform"
            title="Profile"
            onClick={handleProfileClick}
          >
            👤
          </span>
        </div>
      </div>

      <div className="flex" style={{ height: 'calc(100vh - 60px)' }}>
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col">
          {/* Chart Section - Section 3 */}
          <div className="flex-1 p-4 overflow-hidden">
            <div className="bg-white rounded-lg h-full shadow-sm flex flex-col">
              <div className="p-4 border-b flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <h2 className="text-lg font-semibold">Multi-Chart Dashboard</h2>
                    <div className="flex gap-2 text-sm">
                      <span className="text-gray-600">Real-time data from API</span>
                    </div>
                  </div>
                  <div className="text-sm text-gray-500">
                    Cập nhật: {new Date().toLocaleTimeString('vi-VN')}
                  </div>
                </div>
              </div>
              
              {/* Multi-Chart Dashboard */}
              <div className="flex-1 overflow-hidden">
                <MultiChartDashboard/>
              </div>

              {/* Chart notes */}
              <div className="p-4 bg-gray-50 text-sm flex-shrink-0">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <strong>1. Tại sao cần xem biểu đồ:</strong>
                    <p>Biểu đồ là cửa sổ để thấy được xu hướng thị trường.</p>
                  </div>
                  <div>
                    <strong>2. Biểu đồ giá:</strong>
                    <p>Hiển thị sự thay đổi giá của tài sản theo thời gian.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar - Sections 4 & 5 */}
        <div className="w-80 bg-white border-l flex flex-col">
          {/* News Section - Section 4 */}
          <div className="flex-1 p-4 border-b">
            <h3 className="font-semibold mb-3 text-red-600">📈 Trending Headlines</h3>
            <div className="space-y-4">
              <div className="border-l-2 border-blue-500 pl-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-semibold">LONG</span>
                  <span className="text-xs text-gray-500">SR 2.0</span>
                </div>
                <p className="text-sm">BTC/USDT - Xu hướng tăng mạnh được dự báo trong phiên này</p>
              </div>

              <div className="p-3 bg-gray-50 rounded">
                <h4 className="font-medium text-sm mb-2">Market Analysis</h4>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Previous Report Low has been at base of strength if the reported level 
                  and target areas move at approximately 34,500 to 39,500
                </p>
              </div>

              <div className="border-l-2 border-red-500 pl-3">
                <h4 className="font-medium text-sm mb-2 text-red-600">
                  Serious Concern for Global Markets
                </h4>
                <p className="text-xs text-gray-600 leading-relaxed mb-2">
                  If base of digital flows represents not only from loan capital, but more so due to 
                  their relative growth in trade volumes. A broad interpretation of current interest 
                  rate and monetary movements gave serious impact from institutional activities...
                </p>
                <span className="text-xs text-red-600 font-medium">⚠️ High Risk</span>
              </div>
            </div>
          </div>

          {/* Analysis Section - Section 5 */}
          <div className="p-4">
            <h3 className="font-semibold mb-3">⚠️ Disclaimer</h3>
            <div className="space-y-3">
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-yellow-600">⚠️</span>
                  <span className="text-sm font-medium text-yellow-800">Warning - Market Bias Only</span>
                </div>
                <p className="text-xs text-gray-600">
                  Not financial advice but simply analysis that I may share.
                </p>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                <h4 className="font-medium text-sm mb-2">Technical Analysis</h4>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span>RSI (14):</span>
                    <span className="font-medium">65.2</span>
                  </div>
                  <div className="flex justify-between">
                    <span>MACD:</span>
                    <span className="text-green-600 font-medium">Bullish</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Support:</span>
                    <span>42,800</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Resistance:</span>
                    <span>44,200</span>
                  </div>
                </div>
              </div>

              <div className="text-xs text-gray-500 text-center">
                Cập nhật lần cuối: {new Date().toLocaleString('vi-VN')}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;