import React from 'react';
import TradingChart from './TradingChart';

const ChartsContainer = ({ charts, onRemoveChart, onUpdateChart }) => {
  return (
    <div className="p-4">
      <div className="space-y-6">
        {charts.map(chart => (
          <div key={chart.id} className="w-full">
            <TradingChart
              chartConfig={chart}
              onRemove={() => onRemoveChart(chart.id)}
              onConfigChange={(config) => onUpdateChart(chart.id, config)}
              height={400}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default ChartsContainer;
