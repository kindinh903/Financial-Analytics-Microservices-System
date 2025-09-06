import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { backtestService, priceService } from '../services/api';

const Backtest = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [availableSymbols, setAvailableSymbols] = useState([]);
  const [availableStrategies, setAvailableStrategies] = useState([]);

  // Form state
  const [formData, setFormData] = useState({
    symbol: 'BTCUSDT',
    interval: '1h',
    startDate: '2023-03-08T12:00',
    endDate: '2023-03-26T12:00',
    lots: 10000,
    stopLoss: 2,
    takeProfit: 8,
    strategyConditions: [
      {
        id: 1,
        indicator1: 'SMA',
        operator: 'Above',
        indicator2: 'SMA',
        period1: 10,
        period2: 20,
      },
      {
        id: 2,
        indicator1: 'SMA',
        operator: 'Crosses',
        indicator2: 'SMA',
        period1: 30,
        period2: 10,
      }
    ]
  });

  const intervals = [
    { value: '1m', label: '1m' },
    { value: '5m', label: '5m' },
    { value: '15m', label: '15m' },
    { value: '30m', label: '30m' },
    { value: '1h', label: '1h' },
    { value: '2h', label: '2h' },
    { value: '4h', label: '4h' },
    { value: '6h', label: '6h' },
    { value: '8h', label: '8h' },
    { value: '12h', label: '12h' },
    { value: '1d', label: '1d' },
    { value: '3d', label: '3d' },
    { value: '1w', label: '1w' },
    { value: '1mon', label: '1mon' }
  ];

  const operators = [
    { value: 'Above', label: 'Above' },
    { value: 'Below', label: 'Below' },
    { value: 'Crosses', label: 'Crosses' },
    { value: 'Equals', label: 'Equals' }
  ];

  const indicators = [
    { value: 'SMA', label: 'SMA' },
    { value: 'EMA', label: 'EMA' },
    { value: 'RSI', label: 'RSI' },
    { value: 'MACD', label: 'MACD' },
    { value: 'BB', label: 'Bollinger Bands' }
  ];

  useEffect(() => {
    const fetchData = async () => {
      // Fetch symbols
      try {
        const symbolsResponse = await priceService.getAvailableSymbols();
        console.log('Full symbols response:', symbolsResponse);
        console.log('symbolsResponse.data:', symbolsResponse.data);
        console.log('symbolsResponse.data.symbols:', symbolsResponse.data?.symbols);
        
        // Check different possible response structures
        let symbolsData = [];
        if (symbolsResponse.data?.symbols) {
          symbolsData = symbolsResponse.data.symbols;
        } else if (Array.isArray(symbolsResponse.data)) {
          symbolsData = symbolsResponse.data;
        } else if (symbolsResponse.data?.data?.symbols) {
          symbolsData = symbolsResponse.data.data.symbols;
        }
        
        console.log('Final symbolsData:', symbolsData);
        setAvailableSymbols(symbolsData);
        
        // Update formData.symbol if current symbol is not in the fetched list
        if (symbolsData.length > 0 && !symbolsData.includes(formData.symbol)) {
          console.log('Updating symbol from', formData.symbol, 'to', symbolsData[0]);
          setFormData(prev => ({
            ...prev,
            symbol: symbolsData[0]
          }));
        }
      } catch (err) {
        console.error('Error fetching symbols:', err);
        setAvailableSymbols(['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'ADAUSDT', 'XRPUSDT', 'DOGEUSDT', 'DOTUSDT', 'LTCUSDT']);
      }

      // Fetch strategies
      try {
        const response = await fetch('http://localhost:8080/api/backtest/strategies');
        
        if (response.ok) {
          const strategiesData = await response.json();
          console.log('Strategies fetched:', strategiesData);
          setAvailableStrategies(strategiesData);
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      } catch (err) {
        console.error('Error fetching strategies:', err);
        
        setAvailableStrategies([
          { name: 'MOVING_AVERAGE_CROSSOVER', displayName: 'Moving Average Crossover' },
          { name: 'RSI', displayName: 'Relative Strength Index' },
          { name: 'AI_PREDICTION', displayName: 'AI Prediction' }
        ]);
      }
    };

    fetchData();
  }, []);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleConditionChange = (conditionId, field, value) => {
    setFormData(prev => ({
      ...prev,
      strategyConditions: prev.strategyConditions.map(condition =>
        condition.id === conditionId
          ? { ...condition, [field]: value }
          : condition
      )
    }));
  };

  const addNewCondition = () => {
    const newId = Math.max(...formData.strategyConditions.map(c => c.id)) + 1;
    setFormData(prev => ({
      ...prev,
      strategyConditions: [
        ...prev.strategyConditions,
        {
          id: newId,
          indicator1: 'SMA',
          operator: 'Above',
          indicator2: 'SMA',
          period1: 10,
          period2: 20,
        }
      ]
    }));
  };

  const removeCondition = (conditionId) => {
    setFormData(prev => ({
      ...prev,
      strategyConditions: prev.strategyConditions.filter(c => c.id !== conditionId)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Prepare backtest request
      const backtestRequest = {
        symbol: formData.symbol,
        interval: formData.interval,
        startDate: new Date(formData.startDate).toISOString(),
        endDate: new Date(formData.endDate).toISOString(),
        initialCapital: formData.lots,
        stopLossPercent: formData.stopLoss,
        takeProfitPercent: formData.takeProfit,
        strategyName: 'CustomStrategy', // You might want to make this configurable
        strategyParameters: {
          conditions: formData.strategyConditions
        }
      };

      const response = await backtestService.runBacktest(backtestRequest);
      
      // Navigate to results page with the backtest ID
      navigate(`/backtest/results/${response.data.id}`);
    } catch (err) {
      console.error('Error running backtest:', err);
      setError(err.response?.data?.message || 'Failed to run backtest');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Backtest</h1>
          <p className="mt-2 text-gray-600">Configure and run trading strategy backtests</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => navigate('/backtest/history')}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            View History
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-2 rounded-lg font-medium transition-colors"
          >
            {loading ? 'Running...' : 'APPLY'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex">
            <div className="text-red-400">⚠️</div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">{error}</div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Source and Time */}
        <div className="space-y-6">
          {/* Source Section */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Source</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Trading Pair
                </label>
                {/* Debug info */}
                {console.log('Rendering select - availableSymbols:', availableSymbols, 'formData.symbol:', formData.symbol)}
                <select
                  value={formData.symbol}
                  onChange={(e) => handleInputChange('symbol', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {/* Loading state */}
                  {availableSymbols.length === 0 && (
                    <option value="BTCUSDT">BTCUSDT (Loading...)</option>
                  )}
                  
                  {/* Render symbols when available */}
                  {availableSymbols.length > 0 && 
                    availableSymbols.map(symbol => (
                      <option key={symbol} value={symbol}>
                        {symbol}
                      </option>
                    ))
                  }
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Interval
                </label>
                <select
                  value={formData.interval}
                  onChange={(e) => handleInputChange('interval', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {intervals.map(interval => (
                    <option key={interval.value} value={interval.value}>
                      {interval.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Time Section */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Time</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  FROM:
                </label>
                <input
                  type="datetime-local"
                  value={formData.startDate}
                  onChange={(e) => handleInputChange('startDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  TO:
                </label>
                <input
                  type="datetime-local"
                  value={formData.endDate}
                  onChange={(e) => handleInputChange('endDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Strategy */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-6">Strategy</h2>
            
            <div className="space-y-6">
              {/* Basic Parameters */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    LOTS:
                  </label>
                  <input
                    type="number"
                    value={formData.lots}
                    onChange={(e) => handleInputChange('lots', parseFloat(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="$10,000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    SL:
                  </label>
                  <input
                    type="number"
                    value={formData.stopLoss}
                    onChange={(e) => handleInputChange('stopLoss', parseFloat(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="2%"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    TP:
                  </label>
                  <input
                    type="number"
                    value={formData.takeProfit}
                    onChange={(e) => handleInputChange('takeProfit', parseFloat(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="8%"
                  />
                </div>
              </div>

              {/* Strategy Conditions */}
              <div className="space-y-4">
                <h3 className="text-md font-medium text-gray-900">Strategy Conditions</h3>
                
                {formData.strategyConditions.map((condition, index) => (
                  <div key={condition.id} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-gray-700">s{index}:</span>
                      {formData.strategyConditions.length > 1 && (
                        <button
                          onClick={() => removeCondition(condition.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                      <div>
                        <select
                          value={condition.indicator1}
                          onChange={(e) => handleConditionChange(condition.id, 'indicator1', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        >
                          {indicators.map(indicator => (
                            <option key={indicator.value} value={indicator.value}>
                              {indicator.label}
                            </option>
                          ))}
                        </select>
                        <input
                          type="number"
                          value={condition.period1}
                          onChange={(e) => handleConditionChange(condition.id, 'period1', parseInt(e.target.value))}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm mt-1 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="10"
                        />
                      </div>

                      <div>
                        <select
                          value={condition.operator}
                          onChange={(e) => handleConditionChange(condition.id, 'operator', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        >
                          {operators.map(operator => (
                            <option key={operator.value} value={operator.value}>
                              {operator.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <select
                          value={condition.indicator2}
                          onChange={(e) => handleConditionChange(condition.id, 'indicator2', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        >
                          {indicators.map(indicator => (
                            <option key={indicator.value} value={indicator.value}>
                              {indicator.label}
                            </option>
                          ))}
                        </select>
                        <input
                          type="number"
                          value={condition.period2}
                          onChange={(e) => handleConditionChange(condition.id, 'period2', parseInt(e.target.value))}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm mt-1 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="20"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3">
                <button
                  type="button"
                  className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
                >
                  Config Strategy
                </button>
                <button
                  type="button"
                  className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
                >
                  Upload model
                </button>
                <button
                  type="button"
                  onClick={addNewCondition}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  Add new
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Backtest;
