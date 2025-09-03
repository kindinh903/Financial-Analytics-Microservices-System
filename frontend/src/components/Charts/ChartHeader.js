import React from 'react';
import { X, TrendingUp } from 'lucide-react';

const ChartHeader = ({ 
  chartConfig, 
  onConfigChange, 
  onRemove, 
  isLoading, 
  error,
  currentPrice,
  priceChange,
  priceChangePercent,
  onShowIndicatorSelector,
  onRemoveIndicator
}) => {
  return (
    <div className="flex items-center justify-between p-3 border-b bg-gray-50">
      {/* Left side - Symbol and price info */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <select 
            value={chartConfig.symbol} 
            onChange={(e) => onConfigChange({...chartConfig, symbol: e.target.value})}
            className="px-2 py-1 border rounded text-sm"
          >
            <option value="BTCUSDT">BTC/USDT</option>
            <option value="ETHUSDT">ETH/USDT</option>
            <option value="ADAUSDT">ADA/USDT</option>
          </select>
          
          <select 
            value={chartConfig.timeframe} 
            onChange={(e) => onConfigChange({...chartConfig, timeframe: e.target.value})}
            className="px-2 py-1 border rounded text-sm"
          >
            <option value="1m">1m</option>
            <option value="5m">5m</option>
            <option value="15m">15m</option>
            <option value="1h">1h</option>
            <option value="4h">4h</option>
            <option value="1d">1d</option>
          </select>
        </div>

        {currentPrice > 0 && (
          <div className="flex items-center space-x-2">
            <span className="text-lg font-semibold">
              ${currentPrice.toFixed(2)}
            </span>
            <span className={`text-sm ${priceChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)} 
              ({priceChangePercent >= 0 ? '+' : ''}{priceChangePercent.toFixed(2)}%)
            </span>
          </div>
        )}

        {isLoading && (
          <span className="text-xs text-gray-500">Loading...</span>
        )}
        
        {error && (
          <span className="text-xs text-red-500">Error: {error}</span>
        )}
      </div>

      {/* Middle - Indicators */}
      <div className="flex items-center space-x-2">
        {chartConfig.indicators && chartConfig.indicators.map((indicator, index) => (
          <div 
            key={`${indicator.type}_${indicator.period}_${index}`}
            className="flex items-center space-x-1 px-2 py-1 bg-white rounded border text-xs"
          >
            <div 
              className="w-3 h-3 rounded"
              style={{ backgroundColor: indicator.color }}
            ></div>
            <span>
              {indicator.type}({indicator.period}
              {indicator.type === 'BOLL' ? `, ${indicator.stdDev}` : ''})
            </span>
            <button
              onClick={() => onRemoveIndicator && onRemoveIndicator(indicator.id)}
              className="text-gray-400 hover:text-red-500 ml-1"
              title="Remove indicator"
            >
              ×
            </button>
          </div>
        ))}
        
        <button
          onClick={onShowIndicatorSelector}
          className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          + Add Indicator
        </button>
      </div>

      {/* Right side - Remove button */}
      <button 
        onClick={onRemove}
        className="text-red-500 hover:text-red-700 text-sm font-medium"
      >
        Remove
      </button>
    </div>
  );
};

export default ChartHeader;
