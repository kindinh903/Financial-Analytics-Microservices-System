import React, { useState, useEffect } from 'react';
import { priceService } from '../services/api';
import TradingViewChart from '../components/Charts/TradingViewChart';

const Charts = () => {
  const [selectedSymbol, setSelectedSymbol] = useState('BTC/USD');
  const [selectedTimeframe, setSelectedTimeframe] = useState('1D');
  const [availableSymbols, setAvailableSymbols] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const timeframes = [
    { value: '1H', label: '1 Hour' },
    { value: '4H', label: '4 Hours' },
    { value: '1D', label: '1 Day' },
    { value: '1W', label: '1 Week' },
    { value: '1M', label: '1 Month' },
  ];

  // Popular symbols for quick selection
  const popularSymbols = [
    'BTC/USD', 'ETH/USD', 'AAPL', 'GOOGL', 'MSFT', 'TSLA',
    'AMZN', 'NVDA', 'META', 'NFLX', 'SPY', 'QQQ'
  ];

  useEffect(() => {
    const fetchSymbols = async () => {
      try {
        const response = await priceService.getAvailableSymbols();
        const symbols = response.data || popularSymbols;
        setAvailableSymbols(Array.isArray(symbols) ? symbols : popularSymbols);
      } catch (err) {
        console.warn('Using fallback symbols:', err);
        setAvailableSymbols(popularSymbols);
      }
    };

    fetchSymbols();
  }, []);

  useEffect(() => {
    const fetchChartData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await priceService.getHistoricalData(
          selectedSymbol,
          selectedTimeframe,
          100
        );
        
        setChartData(response.data || []);
      } catch (err) {
        console.error('Error fetching chart data:', err);
        setError('Failed to load chart data. Using sample data.');
        // Fallback to mock data
        setChartData(generateMockData());
      } finally {
        setLoading(false);
      }
    };

    fetchChartData();
  }, [selectedSymbol, selectedTimeframe]);

  const generateMockData = () => {
    const data = [];
    const basePrice = 100 + Math.random() * 900;
    
    for (let i = 30; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      const open = basePrice + (Math.random() - 0.5) * 20;
      const high = open + Math.random() * 10;
      const low = open - Math.random() * 10;
      const close = open + (Math.random() - 0.5) * 15;
      const volume = Math.floor(Math.random() * 1000) + 500;
      
      data.push({
        time: date.toISOString().split('T')[0],
        open: parseFloat(open.toFixed(2)),
        high: parseFloat(high.toFixed(2)),
        low: parseFloat(low.toFixed(2)),
        close: parseFloat(close.toFixed(2)),
        volume: volume,
      });
    }
    
    return data.reverse();
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Charts</h1>
        <p className="mt-2 text-gray-600">Advanced trading charts and technical analysis</p>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Symbol Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Symbol
            </label>
            <select
              value={selectedSymbol}
              onChange={(e) => setSelectedSymbol(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            >
              {(Array.isArray(availableSymbols) ? availableSymbols : popularSymbols).map((symbol) => (
                <option key={symbol} value={symbol}>
                  {symbol}
                </option>
              ))}
            </select>
          </div>

          {/* Timeframe Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Timeframe
            </label>
            <select
              value={selectedTimeframe}
              onChange={(e) => setSelectedTimeframe(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            >
              {timeframes.map((tf) => (
                <option key={tf.value} value={tf.value}>
                  {tf.label}
                </option>
              ))}
            </select>
          </div>

          {/* Quick Actions */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quick Actions
            </label>
            <div className="flex space-x-2">
              <button
                onClick={() => setSelectedSymbol('BTC/USD')}
                className="px-3 py-2 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
              >
                BTC
              </button>
              <button
                onClick={() => setSelectedSymbol('ETH/USD')}
                className="px-3 py-2 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
              >
                ETH
              </button>
              <button
                onClick={() => setSelectedSymbol('SPY')}
                className="px-3 py-2 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
              >
                SPY
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Chart */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{selectedSymbol}</h2>
              <p className="text-sm text-gray-500">{selectedTimeframe} Chart</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm text-gray-500">Current Price</p>
                <p className="text-lg font-bold text-gray-900">
                  ${chartData.length > 0 ? chartData[chartData.length - 1]?.close?.toFixed(2) : '0.00'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">24h Change</p>
                <p className="text-sm font-medium text-green-600">+2.45%</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center h-96">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
          ) : error ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <div className="flex">
                <div className="text-yellow-400">⚠️</div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-yellow-800">Warning</p>
                  <div className="mt-2 text-sm text-yellow-700">{error}</div>
                </div>
              </div>
            </div>
          ) : null}
          
          <TradingViewChart
            symbol={selectedSymbol}
            timeframe={selectedTimeframe}
            data={chartData}
          />
        </div>
      </div>

      {/* Additional Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Volume Analysis</h3>
          <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
            <p className="text-gray-500">Volume chart will be implemented here</p>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Technical Indicators</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium text-gray-700">RSI</span>
              <span className="text-sm text-gray-900">65.4</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium text-gray-700">MACD</span>
              <span className="text-sm text-gray-900">0.023</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium text-gray-700">Bollinger Bands</span>
              <span className="text-sm text-gray-900">Upper: 112.5</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Charts; 