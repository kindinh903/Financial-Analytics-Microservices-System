import React, { useEffect, useRef, useState, useCallback } from 'react';
import { X, Plus, Settings, TrendingUp, BarChart3, Activity } from 'lucide-react';
import { priceService } from '../../services/api';

// Individual Chart Component
const TradingChart = ({ chartConfig, onRemove, onConfigChange }) => {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const candleSeriesRef = useRef(null);
  const volumeSeriesRef = useRef(null);
  const indicatorSeriesRef = useRef({});
  const [isReady, setIsReady] = useState(false);
  const [candles, setCandles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch real data from API
  const fetchCandles = useCallback(async () => {
    if (!chartConfig.symbol) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      const res = await priceService.getCandles({ 
        symbol: chartConfig.symbol, 
        interval: chartConfig.timeframe, 
        limit: 500 
      });
      
      console.log(`📈 API Response for ${chartConfig.symbol}:`, {
        status: res?.status,
        data: res?.data,
        candles: res?.data?.data,
        type: typeof res?.data?.data,
        isArray: Array.isArray(res?.data?.data),
        length: res?.data?.data?.length
      });
      
      const rawData = res?.data?.data || [];
      console.log(`🎯 Final candles data for ${chartConfig.symbol}:`, rawData);
      
      // Check first few candles to see the structure
      if (rawData.length > 0) {
        console.log(`📊 First candle sample for ${chartConfig.symbol}:`, rawData[0]);
        console.log(`📊 Last candle sample for ${chartConfig.symbol}:`, rawData[rawData.length - 1]);
      }
      
      // Convert API data to LightweightCharts format
      const data = rawData.map(candle => {
        try {
          return {
            time: Math.floor(candle.close_time / 1000), // Convert milliseconds to seconds
            open: parseFloat(candle.open) || 0,
            high: parseFloat(candle.high) || 0,
            low: parseFloat(candle.low) || 0,
            close: parseFloat(candle.close) || 0,
            volume: parseFloat(candle.volume || 0)
          };
        } catch (error) {
          console.error('Error converting candle data:', error, candle);
          return null;
        }
      }).filter(Boolean); // Remove any null entries
      
      // Sort data by time in ascending order (oldest to newest)
      data.sort((a, b) => a.time - b.time);
      
      console.log(`🔄 Converted ${data.length} candles for ${chartConfig.symbol}`);
      if (data.length > 0) {
        console.log(`📊 First converted candle:`, data[0]);
        console.log(`📊 Last converted candle:`, data[data.length - 1]);
      }
      
      setCandles(data);
      
      // Update chart with real data
      if (candleSeriesRef.current && volumeSeriesRef.current) {
        candleSeriesRef.current.setData(data);
        
        // Set volume data
        const volumeData = data.map(candle => ({
          time: candle.time,
          value: candle.volume,
          color: candle.close > candle.open ? '#00C85180' : '#ff444480'
        }));
        volumeSeriesRef.current.setData(volumeData);
        
        // Update indicators with real data
        updateIndicators(data);
      }
    } catch (e) {
      console.error(`❌ Error fetching data for ${chartConfig.symbol}:`, e);
      setError(e.message || 'Failed to load candles');
    } finally {
      setIsLoading(false);
    }
  }, [chartConfig.symbol, chartConfig.timeframe]);

  // Update indicators when data changes
  const updateIndicators = useCallback((data) => {
    if (!chartRef.current || !data.length) return;
    
    // Remove existing indicators
    Object.keys(indicatorSeriesRef.current).forEach(key => {
      chartRef.current.removeSeries(indicatorSeriesRef.current[key]);
    });
    indicatorSeriesRef.current = {};

    // Add new indicators
    chartConfig.indicators.forEach(indicator => {
      let indicatorData = [];
      let series;

      switch (indicator.type) {
        case 'SMA':
          indicatorData = calculateSMA(data, indicator.period);
          series = chartRef.current.addLineSeries({
            color: indicator.color,
            lineWidth: 2,
            title: `SMA(${indicator.period})`
          });
          break;
        case 'EMA':
          indicatorData = calculateEMA(data, indicator.period);
          series = chartRef.current.addLineSeries({
            color: indicator.color,
            lineWidth: 2,
            title: `EMA(${indicator.period})`
          });
          break;
        case 'RSI':
          indicatorData = calculateRSI(data, indicator.period);
          series = chartRef.current.addLineSeries({
            color: indicator.color,
            lineWidth: 2,
            priceScaleId: 'rsi',
            title: `RSI(${indicator.period})`
          });
          chartRef.current.priceScale('rsi').applyOptions({
            scaleMargins: {
              top: 0.1,
              bottom: 0.1,
            },
          });
          break;
      }

      if (series && indicatorData.length > 0) {
        series.setData(indicatorData);
        indicatorSeriesRef.current[`${indicator.type}_${indicator.period}`] = series;
      }
    });
  }, [chartConfig.indicators]);

  // Calculate indicators
  const calculateSMA = (data, period) => {
    const sma = [];
    for (let i = period - 1; i < data.length; i++) {
      const sum = data.slice(i - period + 1, i + 1).reduce((acc, candle) => acc + candle.close, 0);
      sma.push({
        time: data[i].time,
        value: sum / period
      });
    }
    return sma;
  };

  const calculateEMA = (data, period) => {
    const ema = [];
    const k = 2 / (period + 1);
    let emaValue = data[0].close;
    
    for (let i = 0; i < data.length; i++) {
      if (i === 0) {
        emaValue = data[i].close;
      } else {
        emaValue = data[i].close * k + emaValue * (1 - k);
      }
      ema.push({
        time: data[i].time,
        value: emaValue
      });
    }
    return ema;
  };

  const calculateRSI = (data, period = 14) => {
    const rsi = [];
    const changes = data.slice(1).map((candle, i) => candle.close - data[i].close);
    
    for (let i = period; i < changes.length; i++) {
      const gains = changes.slice(i - period, i).filter(change => change > 0);
      const losses = changes.slice(i - period, i).filter(change => change < 0).map(Math.abs);
      
      const avgGain = gains.length ? gains.reduce((a, b) => a + b, 0) / period : 0;
      const avgLoss = losses.length ? losses.reduce((a, b) => a + b, 0) / period : 0;
      
      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      const rsiValue = 100 - (100 / (1 + rs));
      
      rsi.push({
        time: data[i + 1].time,
        value: rsiValue
      });
    }
    return rsi;
  };

  // Initialize chart
  useEffect(() => {
    const initChart = async () => {
      if (!containerRef.current) return;
      
      try {
        const { createChart } = await import('lightweight-charts');
        const chart = createChart(containerRef.current, {
          layout: {
            background: { color: '#ffffff' },
            textColor: '#333'
          },
          grid: {
            vertLines: { color: '#f0f0f0' },
            horzLines: { color: '#f0f0f0' }
          },
          rightPriceScale: {
            borderVisible: false,
          },
          timeScale: {
            borderVisible: false,
            timeVisible: true,
            secondsVisible: false
          },
          crosshair: {
            mode: 1
          }
        });

        // Add candlestick series
        const candleSeries = chart.addCandlestickSeries({
          upColor: '#00C851',
          downColor: '#ff4444',
          borderVisible: false,
          wickUpColor: '#00C851',
          wickDownColor: '#ff4444',
        });

        // Add volume series
        const volumeSeries = chart.addHistogramSeries({
          color: '#26a69a',
          priceFormat: {
            type: 'volume',
          },
          priceScaleId: 'volume',
        });

        chart.priceScale('volume').applyOptions({
          scaleMargins: {
            top: 0.8,
            bottom: 0,
          },
        });

        chartRef.current = chart;
        candleSeriesRef.current = candleSeries;
        volumeSeriesRef.current = volumeSeries;
        setIsReady(true);

        const handleResize = () => chart.applyOptions({});
        window.addEventListener('resize', handleResize);
        
        return () => {
          window.removeEventListener('resize', handleResize);
          chart.remove();
        };
      } catch (error) {
        console.error('Failed to initialize chart:', error);
      }
    };

    initChart();
  }, []);

  // Fetch data when chart config changes
  useEffect(() => {
    if (isReady) {
      fetchCandles();
    }
  }, [isReady, chartConfig.symbol, chartConfig.timeframe]);

  // Update indicators when indicators config changes
  useEffect(() => {
    if (isReady && candles.length > 0) {
      updateIndicators(candles);
    }
  }, [isReady, chartConfig.indicators, updateIndicators]);

  const currentPrice = candles.length > 0 ? candles[candles.length - 1].close : 0;
  const priceChange = candles.length > 1 ? currentPrice - candles[candles.length - 2].close : 0;
  const priceChangePercent = candles.length > 1 ? (priceChange / candles[candles.length - 2].close) * 100 : 0;

  return (
    <div className="bg-white border rounded-lg shadow-sm">
      {/* Chart Header */}
      <div className="flex items-center justify-between p-3 border-b bg-gray-50">
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

      {/* Indicators Panel */}
      {chartConfig.indicators.length > 0 && (
        <div className="px-3 py-2 border-b bg-gray-50">
          <div className="flex flex-wrap gap-2">
            {chartConfig.indicators.map((indicator, index) => (
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
      )}

      {/* Chart Container */}
      <div ref={containerRef} style={{ height: '300px', width: '100%' }}></div>
    </div>
  );
};

// Main Dashboard Component
const MultiChartDashboard = () => {
  const [charts, setCharts] = useState([
    { 
      id: 1, 
      symbol: 'BTCUSDT', 
      timeframe: '5m',
      indicators: [
        { type: 'SMA', period: 20, color: '#2196F3' },
        { type: 'EMA', period: 50, color: '#FF9800' }
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
    setCharts(charts.filter(chart => chart.id !== id));
  };

  const updateChart = (id, config) => {
    setCharts(charts.map(chart => chart.id === id ? { ...chart, ...config } : chart));
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Multi-Chart Trading Dashboard</h1>
        <div className="flex space-x-2">
          <button 
            onClick={() => setShowMultiChartModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            <BarChart3 size={16} />
            <span>Multi Chart</span>
          </button>
          <button 
            onClick={addChart}
            className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            <Plus size={16} />
            <span>Add Chart</span>
          </button>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {charts.map(chart => (
          <TradingChart
            key={chart.id}
            chartConfig={chart}
            onRemove={() => removeChart(chart.id)}
            onConfigChange={(config) => updateChart(chart.id, config)}
          />
        ))}
      </div>

      {/* Multi Chart Modal */}
      {showMultiChartModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-3/4 h-3/4 max-w-6xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Multi Chart Configuration</h2>
              <button 
                onClick={() => setShowMultiChartModal(false)}
                className="p-2 hover:bg-gray-100 rounded"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mb-4">
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
              onClick={() => {
                // Apply multi-chart configuration
                const newCharts = multiChartConfig.map((config, index) => ({
                  id: Date.now() + index,
                  symbol: config.symbol,
                  timeframe: config.timeframe,
                  indicators: []
                }));
                setCharts(newCharts);
                setShowMultiChartModal(false);
              }}
              className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Confirm
            </button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {charts.length === 0 && (
        <div className="text-center py-20">
          <Activity size={64} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-xl font-semibold text-gray-600 mb-2">No Charts Available</h3>
          <p className="text-gray-500 mb-4">Add your first chart to start trading analysis</p>
          <button 
            onClick={addChart}
            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Add Chart
          </button>
        </div>
      )}
    </div>
  );
};

export default MultiChartDashboard;