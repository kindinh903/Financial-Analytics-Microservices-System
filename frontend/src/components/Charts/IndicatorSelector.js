import React, { useState } from 'react';

const IndicatorSelector = ({ onAddIndicator, onClose, existingIndicators }) => {
  const [selectedIndicator, setSelectedIndicator] = useState('');
  const [period, setPeriod] = useState(14);
  const [stdDev, setStdDev] = useState(2);
  const [color, setColor] = useState('#2196F3');

  const indicators = [
    { value: 'SMA', label: 'Simple Moving Average (SMA)', defaultPeriod: 20 },
    { value: 'EMA', label: 'Exponential Moving Average (EMA)', defaultPeriod: 20 },
    { value: 'BOLL', label: 'Bollinger Bands (BOLL)', defaultPeriod: 20 },
    { value: 'RSI', label: 'Relative Strength Index (RSI)', defaultPeriod: 14 }
  ];

  const colors = [
    { value: '#2196F3', label: 'Blue' },
    { value: '#FF9800', label: 'Orange' },
    { value: '#4CAF50', label: 'Green' },
    { value: '#9C27B0', label: 'Purple' },
    { value: '#F44336', label: 'Red' },
    { value: '#00BCD4', label: 'Cyan' },
    { value: '#795548', label: 'Brown' },
    { value: '#607D8B', label: 'Blue Grey' }
  ];

  const handleIndicatorChange = (indicatorType) => {
    setSelectedIndicator(indicatorType);
    const indicator = indicators.find(ind => ind.value === indicatorType);
    if (indicator) {
      setPeriod(indicator.defaultPeriod);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedIndicator) return;

    const config = {
      type: selectedIndicator,
      period: parseInt(period),
      color: color
    };

    // Add stdDev for Bollinger Bands
    if (selectedIndicator === 'BOLL') {
      config.stdDev = parseFloat(stdDev);
    }

    onAddIndicator(config);
  };

  const isIndicatorExists = (type, period) => {
    return existingIndicators.some(ind => 
      ind.type === type && ind.period === parseInt(period)
    );
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center"
      style={{ zIndex: 9999 }}
      onClick={(e) => {
        e.stopPropagation();
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
        style={{ zIndex: 10000, pointerEvents: 'auto' }}
      >
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">Add Indicator</h3>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClose();
            }}
            onMouseDown={(e) => e.stopPropagation()}
            className="text-gray-400 hover:text-gray-600 text-xl font-semibold pointer-events-auto"
            style={{ zIndex: 10001, cursor: 'pointer' }}
          >
            ×
          </button>
        </div>

        <form 
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleSubmit(e);
          }} 
          className="p-4 space-y-4"
          style={{ pointerEvents: 'auto' }}
        >
          {/* Indicator Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Indicator Type
            </label>
            <select
              value={selectedIndicator}
              onChange={(e) => {
                e.stopPropagation();
                handleIndicatorChange(e.target.value);
              }}
              onMouseDown={(e) => e.stopPropagation()}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 pointer-events-auto"
              style={{ zIndex: 10001, cursor: 'pointer' }}
              required
            >
              <option value="">Select an indicator</option>
              {indicators.map(indicator => (
                <option key={indicator.value} value={indicator.value}>
                  {indicator.label}
                </option>
              ))}
            </select>
          </div>

          {/* Period Input */}
          {selectedIndicator && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Period
              </label>
              <input
                type="number"
                value={period}
                onChange={(e) => {
                  e.stopPropagation();
                  setPeriod(e.target.value);
                }}
                onMouseDown={(e) => e.stopPropagation()}
                min="1"
                max="200"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 pointer-events-auto"
                style={{ zIndex: 10001, cursor: 'text' }}
                required
              />
            </div>
          )}

          {/* Standard Deviation for Bollinger Bands */}
          {selectedIndicator === 'BOLL' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Standard Deviation
              </label>
              <input
                type="number"
                value={stdDev}
                onChange={(e) => {
                  e.stopPropagation();
                  setStdDev(e.target.value);
                }}
                onMouseDown={(e) => e.stopPropagation()}
                min="0.1"
                max="5"
                step="0.1"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 pointer-events-auto"
                style={{ zIndex: 10001, cursor: 'text' }}
                required
              />
            </div>
          )}

          {/* Color Selection */}
          {selectedIndicator && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Color
              </label>
              <div className="grid grid-cols-4 gap-2">
                {colors.map(colorOption => (
                  <button
                    key={colorOption.value}
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setColor(colorOption.value);
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    className={`w-full h-8 rounded border-2 pointer-events-auto ${
                      color === colorOption.value ? 'border-gray-900' : 'border-gray-300'
                    }`}
                    style={{ 
                      backgroundColor: colorOption.value,
                      zIndex: 10001,
                      cursor: 'pointer'
                    }}
                    title={colorOption.label}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Warning for existing indicators */}
          {selectedIndicator && isIndicatorExists(selectedIndicator, period) && (
            <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-3 py-2 rounded text-sm">
              This indicator with the same period already exists.
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onClose();
              }}
              onMouseDown={(e) => e.stopPropagation()}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 pointer-events-auto"
              style={{ zIndex: 10001, cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              onClick={(e) => {
                e.stopPropagation();
                // handleSubmit will be called by form onSubmit
              }}
              onMouseDown={(e) => e.stopPropagation()}
              disabled={!selectedIndicator || isIndicatorExists(selectedIndicator, period)}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed pointer-events-auto"
              style={{ zIndex: 10001, cursor: selectedIndicator && !isIndicatorExists(selectedIndicator, period) ? 'pointer' : 'not-allowed' }}
            >
              Add Indicator
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default IndicatorSelector;