import React, { useState } from 'react';
import DashboardHeader from './DashboardHeader';
import ResizableChartsContainer from './ResizableChartsContainer';
import MultiChartModal from './MultiChartModal';
import EmptyState from './EmptyState';

const MultiChartDashboard = () => {
  const resetLayoutRef = React.useRef(null);
  
  const [charts, setCharts] = useState([
    { 
      id: 1, 
      symbol: 'BTCUSDT', 
      timeframe: '5m',
      indicators: [
        { type: 'SMA', period: 20, color: '#2196F3' }
      ]
    },
    { 
      id: 2, 
      symbol: 'ETHUSDT', 
      timeframe: '15m',
      indicators: [
        { type: 'RSI', period: 14, color: '#9C27B0' }
      ]
    }
  ]);

  const [showMultiChartModal, setShowMultiChartModal] = useState(false);
  const [multiChartConfig, setMultiChartConfig] = useState([
    { symbol: 'ETHUSDT', timeframe: '5m' },
    { symbol: 'BNBUSDT', timeframe: '15m' },
    { symbol: 'BTCUSDT', timeframe: '5m' },
    { symbol: 'ADAUSDT', timeframe: '1h' },
    { symbol: 'DOGEUSDT', timeframe: '1d' }
  ]);

  const addChart = () => {
    const newChart = {
      id: Date.now(),
      symbol: 'BTCUSDT',
      timeframe: '5m',
      indicators: []
    };
    setCharts([...charts, newChart]);
  };

  const removeChart = (id) => {
    console.log('removeChart called with id:', id);
    console.log('Current charts:', charts);
    setCharts(prevCharts => {
      const newCharts = prevCharts.filter(chart => chart.id !== id);
      console.log('New charts after removal:', newCharts);
      return newCharts;
    });
  };

  const updateChart = (id, config) => {
    setCharts(charts.map(chart => chart.id === id ? { ...chart, ...config } : chart));
  };

  const handleMultiChartConfirm = () => {
    const newCharts = multiChartConfig.map((config, index) => ({
      id: Date.now() + index,
      symbol: config.symbol,
      timeframe: config.timeframe,
      indicators: []
    }));
    setCharts(newCharts);
    setShowMultiChartModal(false);
  };

  const handleResetLayout = () => {
    if (resetLayoutRef.current) {
      resetLayoutRef.current();
    }
  };

  return (
    <div className="w-full bg-gray-100 dark:bg-gray-800 transition-colors duration-200">
      <DashboardHeader 
        onAddChart={addChart}
        onOpenMultiChartModal={() => setShowMultiChartModal(true)}
        onResetLayout={handleResetLayout}
      />

      {charts.length > 0 ? (
        <ResizableChartsContainer 
          charts={charts}
          onRemoveChart={removeChart}
          onUpdateChart={updateChart}
          onResetLayout={resetLayoutRef}
        />
      ) : (
        <EmptyState onAddChart={addChart} />
      )}

      {/* <MultiChartModal 
        isOpen={showMultiChartModal}
        onClose={() => setShowMultiChartModal(false)}
        multiChartConfig={multiChartConfig}
        setMultiChartConfig={setMultiChartConfig}
        onConfirm={handleMultiChartConfirm}
      /> */}
    </div>
  );
};

export default MultiChartDashboard;