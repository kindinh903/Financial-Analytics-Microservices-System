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
    selectedStrategy: '',
    strategyParams: {},
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

  // Hardcoded strategies from backend StrategyFactory
  const strategies = [
    {
      name: "MOVING_AVERAGE_CROSSOVER",
      displayName: "Moving Average Crossover",
      description: "Generates signals based on the crossover of short and long moving averages",
      requiresAI: false,
      minimumDataPoints: 50,
      defaultParameters: {
        ShortPeriod: 10,
        LongPeriod: 20,
        Threshold: 0.001
      },
      parameters: [
        {
          name: "ShortPeriod",
          displayName: "Short Period",
          type: "int",
          defaultValue: 10,
          minValue: 1,
          maxValue: 50,
          description: "Period for short moving average"
        },
        {
          name: "LongPeriod",
          displayName: "Long Period", 
          type: "int",
          defaultValue: 20,
          minValue: 1,
          maxValue: 200,
          description: "Period for long moving average"
        },
        {
          name: "Threshold",
          displayName: "Threshold",
          type: "decimal",
          defaultValue: 0.001,
          minValue: 0.0,
          maxValue: 0.1,
          description: "Minimum price deviation threshold"
        }
      ]
    },
    {
      name: "RSI",
      displayName: "Relative Strength Index",
      description: "Generates signals based on RSI oversold/overbought conditions",
      requiresAI: false,
      minimumDataPoints: 30,
      defaultParameters: {
        Period: 14,
        OversoldThreshold: 30,
        OverboughtThreshold: 70
      },
      parameters: [
        {
          name: "Period",
          displayName: "RSI Period",
          type: "int",
          defaultValue: 14,
          minValue: 2,
          maxValue: 50,
          description: "Period for RSI calculation"
        },
        {
          name: "OversoldThreshold",
          displayName: "Oversold Threshold",
          type: "decimal",
          defaultValue: 30,
          minValue: 0,
          maxValue: 50,
          description: "RSI level considered oversold"
        },
        {
          name: "OverboughtThreshold",
          displayName: "Overbought Threshold",
          type: "decimal",
          defaultValue: 70,
          minValue: 50,
          maxValue: 100,
          description: "RSI level considered overbought"
        }
      ]
    },
    {
      name: "AI_PREDICTION",
      displayName: "AI Prediction",
      description: "Generates signals based on AI model predictions",
      requiresAI: true,
      minimumDataPoints: 100,
      defaultParameters: {
        ConfidenceThreshold: 0.6,
        PredictionThreshold: 0.02,
        UseTrendDirection: true
      },
      parameters: [
        {
          name: "ConfidenceThreshold",
          displayName: "Confidence Threshold",
          type: "decimal",
          defaultValue: 0.6,
          minValue: 0.0,
          maxValue: 1.0,
          description: "Minimum AI confidence required"
        },
        {
          name: "PredictionThreshold",
          displayName: "Prediction Threshold",
          type: "decimal",
          defaultValue: 0.02,
          minValue: 0.0,
          maxValue: 0.5,
          description: "Minimum predicted price change"
        },
        {
          name: "UseTrendDirection",
          displayName: "Use Trend Direction",
          type: "bool",
          defaultValue: true,
          minValue: null,
          maxValue: null,
          description: "Use trend direction instead of price prediction"
        }
      ]
    }
  ];

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

      // Set hardcoded strategies instead of fetching
      setAvailableStrategies(strategies);
    };

    fetchData();
  }, []);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validate strategy selection
      if (!formData.selectedStrategy) {
        setError('Please select a trading strategy');
        return;
      }

      // Prepare backtest request
      const backtestRequest = {
        symbol: formData.symbol,
        interval: formData.interval,
        startDate: new Date(formData.startDate).toISOString(),
        endDate: new Date(formData.endDate).toISOString(),
        initialBalance: formData.lots, // Fixed: use correct field name
        stopLoss: formData.stopLoss / 100, // Convert percentage to decimal
        takeProfit: formData.takeProfit / 100, // Convert percentage to decimal
        strategy: formData.selectedStrategy,
        parameters: formData.strategyParams || {},
        commission: 0.001, // Default commission
        maxDrawdown: 0.1 // Default max drawdown
      };

      console.log('Sending backtest request:', backtestRequest);

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
              {/* Strategy Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Strategy
                </label>
                <select
                  value={formData.selectedStrategy || ''}
                  onChange={(e) => {
                    const strategy = e.target.value;
                    const selectedStrategyInfo = strategies.find(s => s.name === strategy);
                    
                    handleInputChange('selectedStrategy', strategy);
                    
                    // Initialize strategy parameters with default values
                    if (selectedStrategyInfo) {
                      const defaultParams = {};
                      selectedStrategyInfo.parameters.forEach(param => {
                        defaultParams[param.name] = param.defaultValue;
                      });
                      handleInputChange('strategyParams', defaultParams);
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Choose a strategy...</option>
                  {strategies.map(strategy => (
                    <option key={strategy.name} value={strategy.name}>
                      {strategy.displayName}
                      {strategy.requiresAI && ' (AI Required)'}
                    </option>
                  ))}
                </select>
                
                {/* Strategy Description */}
                {formData.selectedStrategy && (
                  <div className="mt-2 p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-800">
                      {strategies.find(s => s.name === formData.selectedStrategy)?.description}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-blue-600">
                      <span>Min. Data Points: {strategies.find(s => s.name === formData.selectedStrategy)?.minimumDataPoints}</span>
                      {strategies.find(s => s.name === formData.selectedStrategy)?.requiresAI && (
                        <span className="bg-blue-200 px-2 py-1 rounded">AI Required</span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Strategy Parameters */}
              {formData.selectedStrategy && (
                <div>
                  <h3 className="text-md font-medium text-gray-900 mb-4">Strategy Parameters</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {strategies
                      .find(s => s.name === formData.selectedStrategy)
                      ?.parameters.map(param => (
                        <div key={param.name} className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">
                            {param.displayName}
                            <span className="text-gray-500 text-xs ml-2">
                              ({param.description})
                            </span>
                          </label>
                          {param.type === 'bool' ? (
                            <div className="flex items-center">
                              <input
                                type="checkbox"
                                checked={formData.strategyParams?.[param.name] ?? param.defaultValue}
                                onChange={(e) => handleInputChange('strategyParams', {
                                  ...formData.strategyParams,
                                  [param.name]: e.target.checked
                                })}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              <span className="ml-2 text-sm text-gray-600">
                                {formData.strategyParams?.[param.name] ?? param.defaultValue ? 'Enabled' : 'Disabled'}
                              </span>
                            </div>
                          ) : (
                            <input
                              type="number"
                              value={formData.strategyParams?.[param.name] ?? param.defaultValue}
                              onChange={(e) => handleInputChange('strategyParams', {
                                ...formData.strategyParams,
                                [param.name]: param.type === 'int' ? parseInt(e.target.value) : parseFloat(e.target.value)
                              })}
                              min={param.minValue}
                              max={param.maxValue}
                              step={param.type === 'decimal' ? '0.001' : '1'}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              placeholder={`Default: ${param.defaultValue}`}
                            />
                          )}
                          {param.minValue !== null && param.maxValue !== null && (
                            <p className="text-xs text-gray-500">
                              Range: {param.minValue} - {param.maxValue}
                            </p>
                          )}
                        </div>
                      ))
                    }
                  </div>
                </div>
              )}

              {/* Basic Parameters */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Initial Balance ($):
                  </label>
                  <input
                    type="number"
                    value={formData.lots}
                    onChange={(e) => handleInputChange('lots', parseFloat(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="10000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Stop Loss (%):
                  </label>
                  <input
                    type="number"
                    value={formData.stopLoss}
                    onChange={(e) => handleInputChange('stopLoss', parseFloat(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="2"
                    step="0.1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Take Profit (%):
                  </label>
                  <input
                    type="number"
                    value={formData.takeProfit}
                    onChange={(e) => handleInputChange('takeProfit', parseFloat(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="8"
                    step="0.1"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3">
                <button
                  type="button"
                  className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
                >
                  Config Strategy
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
