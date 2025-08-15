import React, { useState, useEffect } from 'react';
import { userService } from '../services/api';

const Portfolio = () => {
  const [portfolio, setPortfolio] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPortfolio = async () => {
      try {
        setLoading(true);
        const response = await userService.getPortfolio();
        setPortfolio(response.data || []);
      } catch (err) {
        console.error('Error fetching portfolio:', err);
        setError('Failed to load portfolio. Using sample data.');
        // Fallback to mock data
        setPortfolio(generateMockPortfolio());
      } finally {
        setLoading(false);
      }
    };

    fetchPortfolio();
  }, []);

  const generateMockPortfolio = () => [
    {
      id: 1,
      symbol: 'BTC/USD',
      name: 'Bitcoin',
      quantity: 0.5,
      avgPrice: 45000,
      currentPrice: 52000,
      change: 15.56,
      value: 26000,
    },
    {
      id: 2,
      symbol: 'ETH/USD',
      name: 'Ethereum',
      quantity: 2.5,
      avgPrice: 3200,
      currentPrice: 3800,
      change: 18.75,
      value: 9500,
    },
    {
      id: 3,
      symbol: 'AAPL',
      name: 'Apple Inc.',
      quantity: 10,
      avgPrice: 150,
      currentPrice: 175,
      change: 16.67,
      value: 1750,
    },
    {
      id: 4,
      symbol: 'GOOGL',
      name: 'Alphabet Inc.',
      quantity: 5,
      avgPrice: 2800,
      currentPrice: 3200,
      change: 14.29,
      value: 16000,
    },
  ];

  const totalValue = portfolio.reduce((sum, item) => sum + item.value, 0);
  const totalChange = portfolio.reduce((sum, item) => sum + (item.change * item.value / 100), 0);
  const totalChangePercent = (totalChange / totalValue) * 100;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Portfolio</h1>
        <p className="mt-2 text-gray-600">Manage your investments and track performance</p>
      </div>

      {/* Portfolio Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-500">Total Value</h3>
          <p className="text-3xl font-bold text-gray-900">${totalValue.toLocaleString()}</p>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-500">Total Change</h3>
          <p className={`text-3xl font-bold ${totalChangePercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {totalChangePercent >= 0 ? '+' : ''}{totalChangePercent.toFixed(2)}%
          </p>
          <p className={`text-sm ${totalChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            ${totalChange.toLocaleString()}
          </p>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-500">Holdings</h3>
          <p className="text-3xl font-bold text-gray-900">{portfolio.length}</p>
          <p className="text-sm text-gray-500">Assets</p>
        </div>
      </div>

      {/* Portfolio Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Holdings</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Asset
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Avg Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Current Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Change
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Value
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {portfolio.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{item.symbol}</div>
                      <div className="text-sm text-gray-500">{item.name}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.quantity}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${item.avgPrice.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${item.currentPrice.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`text-sm font-medium ${item.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {item.change >= 0 ? '+' : ''}{item.change}%
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    ${item.value.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button className="text-primary-600 hover:text-primary-900">
                        Edit
                      </button>
                      <button className="text-red-600 hover:text-red-900">
                        Remove
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add New Asset */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Asset</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Symbol
            </label>
            <input
              type="text"
              placeholder="e.g., BTC/USD"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quantity
            </label>
            <input
              type="number"
              placeholder="0.0"
              step="0.01"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Purchase Price
            </label>
            <input
              type="number"
              placeholder="0.00"
              step="0.01"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          
          <div className="flex items-end">
            <button className="w-full px-4 py-2 bg-primary-600 text-white font-medium rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
              Add Asset
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex">
            <div className="text-yellow-400">⚠️</div>
            <div className="ml-3">
              <p className="text-sm font-medium text-yellow-800">Warning</p>
              <div className="mt-2 text-sm text-yellow-700">{error}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Portfolio; 