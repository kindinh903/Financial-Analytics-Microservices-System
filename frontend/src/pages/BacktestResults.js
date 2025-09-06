import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { backtestService } from '../services/api';

const BacktestResults = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchResult = async () => {
      try {
        setLoading(true);
        const response = await backtestService.getBacktestResult(id);
        setResult(response.data);
      } catch (err) {
        console.error('Error fetching backtest result:', err);
        setError(err.response?.data?.message || 'Failed to load backtest result');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchResult();
    }
  }, [id]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value);
  };

  const formatPercentage = (value) => {
    return `${(value * 100).toFixed(2)}%`;
  };

  const getPerformanceColor = (value) => {
    if (value > 0) return 'text-green-600';
    if (value < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <div className="text-red-400">⚠️</div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">{error}</div>
            </div>
          </div>
        </div>
        <button
          onClick={() => navigate('/backtest')}
          className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          Back to Backtest
        </button>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Backtest Result Not Found</h2>
          <button
            onClick={() => navigate('/backtest')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            Back to Backtest
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Backtest Results</h1>
          <p className="mt-2 text-gray-600">
            {result.symbol} • {result.interval} • {new Date(result.startDate).toLocaleDateString()} - {new Date(result.endDate).toLocaleDateString()}
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => navigate('/backtest/history')}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            View History
          </button>
          <button
            onClick={() => navigate('/backtest')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            New Backtest
          </button>
        </div>
      </div>

      {/* Performance Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <span className="text-blue-600 text-sm font-medium">$</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Return</p>
              <p className={`text-2xl font-bold ${getPerformanceColor(result.totalReturnPercent)}`}>
                {formatPercentage(result.totalReturnPercent)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <span className="text-green-600 text-sm font-medium">%</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Win Rate</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatPercentage(result.winRate)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <span className="text-purple-600 text-sm font-medium">S</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Sharpe Ratio</p>
              <p className="text-2xl font-bold text-gray-900">
                {result.sharpeRatio?.toFixed(2) || 'N/A'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                <span className="text-red-600 text-sm font-medium">↓</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Max Drawdown</p>
              <p className="text-2xl font-bold text-red-600">
                {formatPercentage(result.maxDrawdown)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Results */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Trading Statistics */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Trading Statistics</h2>
          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Trades</span>
              <span className="font-medium">{result.totalTrades}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Winning Trades</span>
              <span className="font-medium text-green-600">{result.winningTrades}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Losing Trades</span>
              <span className="font-medium text-red-600">{result.losingTrades}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Average Win</span>
              <span className="font-medium text-green-600">
                {formatPercentage(result.averageWin)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Average Loss</span>
              <span className="font-medium text-red-600">
                {formatPercentage(result.averageLoss)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Profit Factor</span>
              <span className="font-medium">{result.profitFactor?.toFixed(2) || 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* Financial Summary */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Financial Summary</h2>
          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="text-gray-600">Initial Capital</span>
              <span className="font-medium">{formatCurrency(result.initialCapital)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Final Capital</span>
              <span className="font-medium">{formatCurrency(result.finalCapital)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Total Profit/Loss</span>
              <span className={`font-medium ${getPerformanceColor(result.totalReturnPercent)}`}>
                {formatCurrency(result.finalCapital - result.initialCapital)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Accuracy</span>
              <span className="font-medium">{formatPercentage(result.accuracy)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Backtest Duration</span>
              <span className="font-medium">
                {Math.ceil((new Date(result.endDate) - new Date(result.startDate)) / (1000 * 60 * 60 * 24))} days
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Strategy Information */}
      <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Strategy Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-md font-medium text-gray-700 mb-2">Strategy Details</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Strategy Name</span>
                <span className="font-medium">{result.strategyName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Symbol</span>
                <span className="font-medium">{result.symbol}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Interval</span>
                <span className="font-medium">{result.interval}</span>
              </div>
            </div>
          </div>
          <div>
            <h3 className="text-md font-medium text-gray-700 mb-2">Parameters</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Stop Loss</span>
                <span className="font-medium">{result.stopLossPercent}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Take Profit</span>
                <span className="font-medium">{result.takeProfitPercent}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Trade History */}
      {result.trades && result.trades.length > 0 && (
        <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Recent Trades</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Entry Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Exit Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Entry Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Exit Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    P&L
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {result.trades.slice(0, 10).map((trade, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(trade.entryTime).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {trade.exitTime ? new Date(trade.exitTime).toLocaleString() : 'Open'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(trade.entryPrice)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {trade.exitPrice ? formatCurrency(trade.exitPrice) : '-'}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                      trade.pnl >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {trade.pnl ? formatCurrency(trade.pnl) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        trade.status === 'WIN' 
                          ? 'bg-green-100 text-green-800'
                          : trade.status === 'LOSS'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {trade.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default BacktestResults;
