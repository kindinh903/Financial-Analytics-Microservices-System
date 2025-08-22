import React, { useState, useEffect } from 'react';
import TradingChart from './TradingChart';
import './MultiChartDashboard.css';

const MultiChartDashboard = () => {
  const [charts, setCharts] = useState([
    { id: 1, symbol: 'BTCUSDT', interval: '1m', height: 400 },
    { id: 2, symbol: 'ETHUSDT', interval: '5m', height: 400 },
  ]);
  
  const [availableSymbols, setAvailableSymbols] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load available symbols
  useEffect(() => {
    const loadSymbols = async () => {
      try {
        const response = await fetch('http://localhost:8081/api/symbols');
        if (response.ok) {
          const data = await response.json();
          setAvailableSymbols(data.symbols || []);
        }
      } catch (error) {
        console.error('Failed to load symbols:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSymbols();
  }, []);

  const addChart = () => {
    const newChart = {
      id: Date.now(),
      symbol: 'BTCUSDT',
      interval: '1m',
      height: 400,
    };
    setCharts([...charts, newChart]);
  };

  const removeChart = (chartId) => {
    setCharts(charts.filter(chart => chart.id !== chartId));
  };

  const updateChart = (chartId, updates) => {
    setCharts(charts.map(chart => 
      chart.id === chartId ? { ...chart, ...updates } : chart
    ));
  };

  const duplicateChart = (chartId) => {
    const chartToDuplicate = charts.find(chart => chart.id === chartId);
    if (chartToDuplicate) {
      const newChart = {
        ...chartToDuplicate,
        id: Date.now(),
      };
      setCharts([...charts, newChart]);
    }
  };

  if (isLoading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner"></div>
        <span>Loading dashboard...</span>
      </div>
    );
  }

  return (
    <div className="multi-chart-dashboard">
      {/* Dashboard Header */}
      <div className="dashboard-header">
        <h1>Financial Analytics Dashboard</h1>
        <div className="dashboard-controls">
          <button onClick={addChart} className="add-chart-btn">
            + Add Chart
          </button>
          <div className="dashboard-info">
            <span>Charts: {charts.length}</span>
            <span>Symbols: {availableSymbols.length}</span>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="charts-grid">
        {charts.map((chart) => (
          <div key={chart.id} className="chart-card">
            {/* Chart Card Header */}
            <div className="chart-card-header">
              <div className="chart-controls">
                <select
                  value={chart.symbol}
                  onChange={(e) => updateChart(chart.id, { symbol: e.target.value })}
                  className="symbol-selector"
                >
                  {availableSymbols.map(symbol => (
                    <option key={symbol} value={symbol}>{symbol}</option>
                  ))}
                </select>
                
                <select
                  value={chart.interval}
                  onChange={(e) => updateChart(chart.id, { interval: e.target.value })}
                  className="interval-selector"
                >
                  <option value="1m">1m</option>
                  <option value="5m">5m</option>
                  <option value="15m">15m</option>
                  <option value="1h">1h</option>
                  <option value="4h">4h</option>
                  <option value="1d">1d</option>
                </select>
              </div>
              
              <div className="chart-actions">
                <button
                  onClick={() => duplicateChart(chart.id)}
                  className="action-btn duplicate-btn"
                  title="Duplicate Chart"
                >
                  📋
                </button>
                <button
                  onClick={() => removeChart(chart.id)}
                  className="action-btn remove-btn"
                  title="Remove Chart"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Chart Content */}
            <div className="chart-content">
              <TradingChart
                symbol={chart.symbol}
                interval={chart.interval}
                height={chart.height}
                showVolume={true}
                showGrid={true}
                showLegend={true}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {charts.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">📊</div>
          <h3>No Charts Added</h3>
          <p>Click "Add Chart" to start monitoring your favorite trading pairs</p>
          <button onClick={addChart} className="add-chart-btn">
            + Add Your First Chart
          </button>
        </div>
      )}

      {/* Quick Add Presets */}
      <div className="quick-add-presets">
        <h3>Quick Add Popular Pairs</h3>
        <div className="preset-buttons">
          {['BTCUSDT', 'ETHUSDT', 'ADAUSDT', 'BNBUSDT', 'XRPUSDT'].map(symbol => (
            <button
              key={symbol}
              onClick={() => {
                const newChart = {
                  id: Date.now(),
                  symbol,
                  interval: '1m',
                  height: 400,
                };
                setCharts([...charts, newChart]);
              }}
              className="preset-btn"
            >
              {symbol}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MultiChartDashboard;
