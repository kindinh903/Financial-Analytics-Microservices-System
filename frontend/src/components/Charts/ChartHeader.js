import React, { useState } from 'react';
import { X, TrendingUp, Wifi, WifiOff, Brain } from 'lucide-react';
import { aiPredictService, priceService } from '../../services/api';

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
  onRemoveIndicator,
  isConnected = false
}) => {
  const [predictionLoading, setPredictionLoading] = useState(false);
  const [predictionResult, setPredictionResult] = useState(null);
  const [predictionError, setPredictionError] = useState(null);

  // Helper function to calculate open_time based on interval
  const getIntervalMs = (interval) => {
    const unit = interval.slice(-1);
    const amount = parseInt(interval.slice(0, -1));
    
    const multipliers = {
      'm': 60 * 1000,        // minutes
      'h': 60 * 60 * 1000,   // hours
      'd': 24 * 60 * 60 * 1000, // days
      'w': 7 * 24 * 60 * 60 * 1000, // weeks
      'M': 30 * 24 * 60 * 60 * 1000, // months
    };
    
    return amount * (multipliers[unit] || 60 * 1000);
  };

  const handleAIPrediction = async () => {
    try {
      setPredictionLoading(true);
      setPredictionError(null);
      setPredictionResult(null);

      // Lấy dữ liệu lịch sử để gửi cho AI service
      const historicalResponse = await priceService.getHistoricalData(
        chartConfig.symbol, 
        chartConfig.timeframe, 
        100
      );

      // Kiểm tra response structure
      if (!historicalResponse.data || !historicalResponse.data.data) {
        throw new Error('Không thể lấy dữ liệu lịch sử');
      }

      const historicalData = historicalResponse.data.data;

      // Chuẩn bị dữ liệu theo format mà AI service yêu cầu
      const intervalMs = getIntervalMs(chartConfig.timeframe);
      const formattedData = historicalData.map(candle => ({
        symbol: candle.symbol,
        interval: candle.interval,
        open_time: candle.close_time - intervalMs,
        close_time: candle.close_time,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
        volume: candle.volume
      }));

      // Gọi AI prediction service
      const response = await aiPredictService.predictPrice({
        data: formattedData,
        model_dir: "models"
      });

      setPredictionResult(response.data.result);
    } catch (error) {
      console.error('AI Prediction Error:', error);
      setPredictionError(error.response?.data?.detail || error.message || 'Lỗi khi dự đoán giá');
    } finally {
      setPredictionLoading(false);
    }
  };
  return (
    <div className="chart-header flex items-center justify-between p-2 border-b border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 transition-colors duration-200">
      {/* Left side - Price info and status */}
      <div className="flex items-center space-x-3">
        {currentPrice > 0 && (
          <div className="flex items-center space-x-2">
            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              ${currentPrice.toFixed(2)}
            </span>
            <span className={`text-xs ${priceChange >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)} 
              ({priceChangePercent >= 0 ? '+' : ''}{priceChangePercent.toFixed(2)}%)
            </span>
          </div>
        )}

        {isLoading && (
          <span className="text-xs text-gray-500 dark:text-gray-400">Loading...</span>
        )}
        
        {error && (
          <span className="text-xs text-red-500 dark:text-red-400">Error: {error}</span>
        )}

        {/* WebSocket Connection Status */}
        <div className="flex items-center space-x-1">
          {!isLoading ? (
            <>
              <Wifi className="w-3 h-3 text-green-500 dark:text-green-400" />
              <span className="text-xs text-green-600 dark:text-green-400">Live</span>
            </>
          ) : (
            <>
              <WifiOff className="w-3 h-3 text-red-500 dark:text-red-400" />
              <span className="text-xs text-red-600 dark:text-red-400">Offline</span>
            </>
          )}
        </div>
      </div>

      {/* Right side - Indicators and AI Prediction */}
      <div className="flex items-center space-x-2">
        {chartConfig.indicators && chartConfig.indicators.map((indicator, index) => (
          <div 
            key={`${indicator.type}_${indicator.period}_${index}`}
            className="flex items-center space-x-1 px-2 py-0.5 bg-white dark:bg-gray-600 rounded border border-gray-200 dark:border-gray-500 text-xs transition-colors duration-200"
          >
            <div 
              className="w-2 h-2 rounded"
              style={{ backgroundColor: indicator.color }}
            ></div>
            <span className="text-xs text-gray-900 dark:text-gray-100">
              {indicator.type}({indicator.period}
              {indicator.type === 'BOLL' ? `, ${indicator.stdDev}` : ''})
            </span>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onRemoveIndicator && onRemoveIndicator(indicator.id);
              }}
              onMouseDown={(e) => e.stopPropagation()}
              className="text-gray-400 dark:text-gray-300 hover:text-red-500 dark:hover:text-red-400 ml-1 text-xs pointer-events-auto cursor-pointer transition-colors"
              style={{ zIndex: 1001 }}
              title="Remove indicator"
            >
              ×
            </button>
          </div>
        ))}
        
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onShowIndicatorSelector();
          }}
          onMouseDown={(e) => e.stopPropagation()}
          className="px-2 py-1 bg-blue-600 dark:bg-blue-500 text-white rounded text-xs hover:bg-blue-700 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 pointer-events-auto cursor-pointer transition-colors"
          style={{ zIndex: 1001 }}
        >
          + Indicator
        </button>

        {/* AI Prediction Section */}
        <div className="flex items-center space-x-2 ml-3">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleAIPrediction();
            }}
            onMouseDown={(e) => e.stopPropagation()}
            disabled={predictionLoading}
            className="flex items-center space-x-1 px-2 py-1 bg-purple-600 dark:bg-purple-500 text-white rounded text-xs hover:bg-purple-700 dark:hover:bg-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 disabled:opacity-50 disabled:cursor-not-allowed pointer-events-auto transition-colors"
            style={{ zIndex: 1001 }}
          >
            <Brain className="w-3 h-3" />
            <span>{predictionLoading ? 'Predicting...' : 'AI Predict'}</span>
          </button>

          {/* Prediction Result Display */}
          {predictionResult && (
            <div className="flex items-center space-x-1 px-2 py-0.5 bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700 rounded text-xs transition-colors duration-200">
              <span className="text-green-800 dark:text-green-300 font-medium">Next:</span>
              <span className="text-green-700 dark:text-green-200">
                ${predictionResult.predicted_next_close ? predictionResult.predicted_next_close.toFixed(2) : 'N/A'}
              </span>
              {predictionResult.trend && (
                <span className={`text-xs font-medium ${
                  predictionResult.trend === 'UP' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                }`}>
                  ({predictionResult.trend})
                </span>
              )}
            </div>
          )}

          {predictionError && (
            <div className="flex items-center space-x-1 px-2 py-0.5 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded text-xs transition-colors duration-200">
              <span className="text-red-800 dark:text-red-300 font-medium">Error:</span>
              <span className="text-red-700 dark:text-red-200">{predictionError}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChartHeader;
