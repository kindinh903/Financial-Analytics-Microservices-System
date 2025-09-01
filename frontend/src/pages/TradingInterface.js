import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import TradingViewWidget from 'react-tradingview-widget';

const TradingInterface = () => {
  const [selectedSymbol, setSelectedSymbol] = useState('BTCUSDT');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    console.log('🚀 TradingInterface component loaded!');
    // Simulate loading time for TradingView Widget
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  const handleSymbolChange = (symbol) => {
    setSelectedSymbol(symbol);
    setIsLoading(true);
    // Simulate loading when changing symbol
    setTimeout(() => setIsLoading(false), 1000);
  };

  const watchlistData = [
    { symbol: 'BTCUSDT', price: '43,250.00', change: '+2.45%', changeColor: 'text-green-600' },
    { symbol: 'ETHUSDT', price: '2,680.50', change: '+1.23%', changeColor: 'text-green-600' },
    { symbol: 'ADAUSDT', price: '0.485', change: '-0.85%', changeColor: 'text-red-600' },
    { symbol: 'SOLUSDT', price: '98.45', change: '+3.21%', changeColor: 'text-green-600' },
    { symbol: 'DOTUSDT', price: '7.25', change: '-1.45%', changeColor: 'text-red-600' },
  ];

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
          <Link to="/login" className="text-xl cursor-pointer hover:scale-110 transition-transform" title="Đăng nhập">
            👤
          </Link>
        </div>
      </div>

      <div className="flex h-screen">
        {/* Left Sidebar - Section 2 */}
        <div className="w-64 bg-white border-r p-4">
          <div className="mb-6">
            <h3 className="font-semibold mb-3">Danh sách theo dõi</h3>
            <div className="space-y-2">
              {watchlistData.map((item, idx) => (
                <div 
                  key={idx}
                  className={`flex justify-between items-center p-2 rounded cursor-pointer hover:bg-gray-50 transition-colors ${
                    selectedSymbol === item.symbol ? 'bg-blue-50 border-l-2 border-blue-500' : ''
                  }`}
                  onClick={() => handleSymbolChange(item.symbol)}
                >
                  <div>
                    <div className="font-medium text-sm">{item.symbol}</div>
                    <div className="text-xs text-gray-500">{item.price}</div>
                  </div>
                  <div className={`text-xs ${item.changeColor}`}>
                    {item.change}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <h3 className="font-semibold mb-3">Công cụ phân tích</h3>
            <div className="space-y-2">
              <button className="w-full text-left p-2 hover:bg-gray-50 rounded text-sm transition-colors">📈 Indicators</button>
              <button className="w-full text-left p-2 hover:bg-gray-50 rounded text-sm transition-colors">📊 Drawing Tools</button>
              <button className="w-full text-left p-2 hover:bg-gray-50 rounded text-sm transition-colors">⚡ Alerts</button>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col">
          {/* Chart Section - Section 3 */}
          <div className="flex-1 p-4">
            <div className="bg-white rounded-lg h-full shadow-sm">
              <div className="p-4 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <h2 className="text-lg font-semibold">{selectedSymbol}</h2>
                    <div className="flex gap-2 text-sm">
                      <span className="text-gray-600">Giá hiện tại:</span>
                      <span className="font-semibold">43,250.00 USDT</span>
                      <span className="text-green-600">+2.45%</span>
                    </div>
                  </div>
                  <div className="text-sm text-gray-500">
                    Cập nhật: {new Date().toLocaleTimeString('vi-VN')}
                  </div>
                </div>
              </div>
              
              {/* TradingView Widget */}
              <div className="h-96 relative">
                {isLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-2"></div>
                      <p className="text-gray-600">Đang tải biểu đồ...</p>
                    </div>
                  </div>
                )}
                
                {!isLoading && (
                  <TradingViewWidget
                    symbol={`BINANCE:${selectedSymbol}`}
                    theme="light"
                    interval="1H"
                    timezone="Asia/Ho_Chi_Minh"
                    style="1"
                    locale="vi"
                    toolbar_bg="#f1f3f6"
                    enable_publishing={false}
                    allow_symbol_change={true}
                    container_id="tradingview_chart"
                    autosize={true}
                    studies={[
                      "MASimple@tv-basicstudies",
                      "RSI@tv-basicstudies"
                    ]}
                  />
                )}
              </div>

              {/* Chart notes */}
              <div className="p-4 bg-gray-50 text-sm">
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

export default TradingInterface;