import React from 'react';
import { X } from 'lucide-react';

const IndicatorsPanel = ({ indicators, onRemoveIndicator, onConfigChange, chartConfig }) => {
  if (indicators.length === 0) return null;

  return (
    <div className="px-3 py-2 border-b bg-gray-50 flex-shrink-0">
      <div className="flex flex-wrap gap-2">
        {indicators.map((indicator, index) => (
          <div key={index} className="flex items-center space-x-2 bg-white px-2 py-1 rounded border text-xs">
            <div 
              className="w-3 h-3 rounded"
              style={{ backgroundColor: indicator.color }}
            ></div>
            <span>{indicator.type}({indicator.period})</span>
            <button
              onClick={() => {
                const newIndicators = chartConfig.indicators.filter((_, i) => i !== index);
                onConfigChange({ ...chartConfig, indicators: newIndicators });
              }}
              className="text-gray-400 hover:text-red-500"
            >
              <X size={12} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default IndicatorsPanel;
