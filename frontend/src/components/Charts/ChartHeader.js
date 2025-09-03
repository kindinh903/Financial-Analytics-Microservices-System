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
  priceChangePercent 
}) => {
  return (
    <div className="flex items-center justify-between p-3 border-b bg-gray-50 flex-shrink-0">
      <div className="flex items-center space-x-4">
        <select 
          value={chartConfig.symbol}
          onChange={(e) => onConfigChange({ ...chartConfig, symbol: e.target.value })}
          className="px-2 py-1 border rounded text-sm font-semibold bg-white"
        >
          <option value="BTCUSDT">BTCUSDT</option>
          <option value="ETHUSDT">ETHUSDT</option>
          <option value="ADAUSDT">ADAUSDT</option>
          <option value="BNBUSDT">BNBUSDT</option>
          <option value="DOGEUSDT">DOGEUSDT</option>
          <option value="DOTUSDT">DOTUSDT</option>
          <option value="LTCUSDT">LTCUSDT</option>
        </select>
        
        <select 
          value={chartConfig.timeframe}
          onChange={(e) => onConfigChange({ ...chartConfig, timeframe: e.target.value })}
          className="px-2 py-1 border rounded text-sm bg-white"
        >
          <option value="1m">1m</option>
          <option value="5m">5m</option>
          <option value="15m">15m</option>
          <option value="1h">1h</option>
          <option value="4h">4h</option>
          <option value="1d">1d</option>
        </select>

        <div className="flex items-center space-x-2 text-sm">
          {isLoading ? (
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
              <span className="text-gray-600">Loading...</span>
            </div>
          ) : error ? (
            <span className="text-red-600 text-xs">{error}</span>
          ) : (
            <>
              <span className="font-bold">{currentPrice.toFixed(
                chartConfig.symbol.includes('BTC') && !chartConfig.symbol.includes('USDT') ? 8 : 
                chartConfig.symbol.includes('ETH') ? 2 :
                chartConfig.symbol.includes('ADA') || chartConfig.symbol.includes('DOGE') ? 4 : 2
              )}</span>
              <span className={`flex items-center ${priceChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)} ({priceChangePercent.toFixed(2)}%)
              </span>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <button 
          onClick={() => {
            const newIndicator = { type: 'SMA', period: 20, color: '#2196F3' };
            onConfigChange({ 
              ...chartConfig, 
              indicators: [...chartConfig.indicators, newIndicator] 
            });
          }}
          className="p-1 text-gray-600 hover:bg-gray-200 rounded"
          title="Add Indicator"
        >
          <TrendingUp size={16} />
        </button>
        <button 
          onClick={onRemove}
          className="p-1 text-gray-600 hover:bg-gray-200 rounded"
          title="Remove Chart"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};

export default ChartHeader;
