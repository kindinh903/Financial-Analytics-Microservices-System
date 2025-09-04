import React from 'react';
import { X } from 'lucide-react';

const MultiChartModal = ({ isOpen, onClose, multiChartConfig, setMultiChartConfig, onConfirm }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-3/4 h-3/4 max-w-4xl flex flex-col">
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <h2 className="text-xl font-bold">Multi Chart Configuration</h2>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-auto mb-4">
          {multiChartConfig.map((config, index) => (
            <div key={index} className="flex items-center space-x-4 mb-2">
              <span className="w-8 text-center font-semibold">{index + 1}.</span>
              <select 
                value={config.symbol}
                onChange={(e) => {
                  const newConfig = [...multiChartConfig];
                  newConfig[index].symbol = e.target.value;
                  setMultiChartConfig(newConfig);
                }}
                className="px-3 py-1 border rounded"
              >
                <option value="ETHUSDT">ETHUSDT</option>
                <option value="BNBUSDT">BNBUSDT</option>
                <option value="BTCUSDT">BTCUSDT</option>
                <option value="ADAUSDT">ADAUSDT</option>
                <option value="DOGEUSDT">DOGEUSDT</option>
                <option value="DOTUSDT">DOTUSDT</option>
                <option value="LTCUSDT">LTCUSDT</option>
              </select>
              <select 
                value={config.timeframe}
                onChange={(e) => {
                  const newConfig = [...multiChartConfig];
                  newConfig[index].timeframe = e.target.value;
                  setMultiChartConfig(newConfig);
                }}
                className="px-3 py-1 border rounded"
              >
                <option value="5m">5m</option>
                <option value="15m">15m</option>
                <option value="1h">1h</option>
                <option value="4h">4h</option>
                <option value="1d">1d</option>
              </select>
            </div>
          ))}
        </div>

        <button 
          onClick={onConfirm}
          className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex-shrink-0"
        >
          Confirm
        </button>
      </div>
    </div>
  );
};

export default MultiChartModal;
