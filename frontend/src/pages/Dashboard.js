import React, { useState, useEffect } from 'react';
import { healthCheck, priceService } from '../services/api';
import TradingViewChart from '../components/Charts/TradingViewChart';

const Dashboard = () => {
  const [servicesStatus, setServicesStatus] = useState({});
  const [marketData, setMarketData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const checkServices = async () => {
      try {
        setLoading(true);
        
        // Check all services health
        const [gateway, auth, price, news, user] = await Promise.allSettled([
          healthCheck.gateway(),
          healthCheck.auth(),
          healthCheck.price(),
          healthCheck.news(),
          healthCheck.user(),
        ]);

        setServicesStatus({
          gateway: gateway.status === 'fulfilled',
          auth: auth.status === 'fulfilled',
          price: price.status === 'fulfilled',
          news: news.status === 'fulfilled',
          user: user.status === 'fulfilled',
        });

        // Get market overview if price service is available
        if (price.status === 'fulfilled') {
          try {
            const response = await priceService.getMarketOverview();
            setMarketData(response.data || []);
          } catch (err) {
            console.warn('Could not fetch market data:', err);
          }
        }

      } catch (err) {
        setError('Failed to check services status');
        console.error('Error checking services:', err);
      } finally {
        setLoading(false);
      }
    };

    checkServices();
  }, []);

  // Mock data for chart (replace with real data from API)
  const mockChartData = [
    { time: '2024-01-01', open: 100, high: 105, low: 98, close: 103, volume: 1000 },
    { time: '2024-01-02', open: 103, high: 108, low: 100, close: 106, volume: 1200 },
    { time: '2024-01-03', open: 106, high: 110, low: 104, close: 108, volume: 1100 },
    { time: '2024-01-04', open: 108, high: 112, low: 105, close: 110, volume: 1300 },
    { time: '2024-01-05', open: 110, high: 115, low: 108, close: 113, volume: 1400 },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex">
          <div className="text-red-400">⚠️</div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error</h3>
            <div className="mt-2 text-sm text-red-700">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-gray-600">Overview of your financial analytics platform</p>
      </div>

      {/* Services Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {Object.entries(servicesStatus).map(([service, isHealthy]) => (
          <div
            key={service}
            className={`p-4 rounded-lg border ${
              isHealthy
                ? 'bg-green-50 border-green-200 text-green-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            <div className="flex items-center">
              <div className={`w-3 h-3 rounded-full mr-3 ${
                isHealthy ? 'bg-green-500' : 'bg-red-500'
              }`} />
              <div>
                <p className="text-sm font-medium capitalize">{service}</p>
                <p className="text-xs">
                  {isHealthy ? 'Healthy' : 'Unavailable'}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Market Overview */}
      {marketData.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Market Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {marketData.slice(0, 3).map((item, index) => (
              <div key={index} className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-900">{item.symbol}</p>
                <p className="text-lg font-bold text-gray-900">${item.price}</p>
                <p className={`text-sm ${item.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {item.change >= 0 ? '+' : ''}{item.change}%
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Chart Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TradingViewChart
          symbol="BTC/USD"
          timeframe="1D"
          data={mockChartData}
        />
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <button className="w-full p-3 text-left bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
              <div className="flex items-center">
                <span className="text-blue-600 mr-3">📈</span>
                <div>
                  <p className="font-medium text-blue-900">View All Charts</p>
                  <p className="text-sm text-blue-700">Explore detailed price charts</p>
                </div>
              </div>
            </button>
            
            <button className="w-full p-3 text-left bg-green-50 hover:bg-green-100 rounded-lg transition-colors">
              <span className="text-green-600 mr-3">💼</span>
              <div>
                <p className="font-medium text-green-900">Portfolio</p>
                <p className="text-sm text-green-700">Manage your investments</p>
              </div>
            </button>
            
            <button className="w-full p-3 text-left bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors">
              <span className="text-purple-600 mr-3">📰</span>
              <div>
                <p className="font-medium text-purple-900">Latest News</p>
                <p className="text-sm text-purple-700">Stay updated with market news</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 