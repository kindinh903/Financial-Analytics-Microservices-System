import React, { useEffect, useRef, useState, useCallback } from 'react';
import { priceService } from '../../services/api';
import { useWebSocketChart } from '../../hooks/useWebSocket';
import { useTheme } from '../../contexts/ThemeContext';
import ChartHeader from './ChartHeader';
import IndicatorSelector from './IndicatorSelector';

const TradingChart = ({ chartConfig, onRemove, onConfigChange, height = 300 }) => {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const candleSeriesRef = useRef(null);
  const volumeSeriesRef = useRef(null);
  const indicatorSeriesRef = useRef({});
  const [isReady, setIsReady] = useState(false);
  const [candles, setCandles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showIndicatorSelector, setShowIndicatorSelector] = useState(false);
  const [currentPrice, setCurrentPrice] = useState(0);
  
  const { isDarkMode } = useTheme();

  // Handle WebSocket candle updates
  const handleCandleUpdate = useCallback((data) => {
    console.log(`📨 WebSocket candle data for ${chartConfig.symbol}:`, data);
    
    if (data && data.candle) {
      const newCandle = {
        time: Math.floor(data.candle.close_time / 1000),
        open: parseFloat(data.candle.open) || 0,
        high: parseFloat(data.candle.high) || 0,
        low: parseFloat(data.candle.low) || 0,
        close: parseFloat(data.candle.close) || 0,
        volume: parseFloat(data.candle.volume || 0)
      };

      setCandles(prevCandles => {
        const updatedCandles = [...prevCandles];
        const lastIndex = updatedCandles.length - 1;
        
        // Update the last candle if it's the same time, otherwise add new candle
        if (lastIndex >= 0 && updatedCandles[lastIndex].time === newCandle.time) {
          updatedCandles[lastIndex] = newCandle;
        } else {
          updatedCandles.push(newCandle);
        }
        
        // Update chart
        if (candleSeriesRef.current) {
          candleSeriesRef.current.update(newCandle);
        }
        
        // Update volume
        if (volumeSeriesRef.current) {
          const volumePoint = {
            time: newCandle.time,
            value: newCandle.volume,
            color: newCandle.close > newCandle.open ? '#00C85180' : '#ff444480'
          };
          volumeSeriesRef.current.update(volumePoint);
        }
        
        return updatedCandles;
      });

      setCurrentPrice(newCandle.close);
    }
  }, [chartConfig.symbol]);

  // Handle WebSocket price updates
  const handlePriceUpdate = useCallback((data) => {
    if (data && data.price) {
      setCurrentPrice(parseFloat(data.price) || 0);
    }
  }, []);

  // Handle WebSocket errors
  const handleWebSocketError = useCallback((error) => {
    console.error(`❌ WebSocket error for ${chartConfig.symbol}:`, error);
  }, [chartConfig.symbol]);

  // Use WebSocket hook
  const { isConnected } = useWebSocketChart({
    symbol: chartConfig.symbol,
    interval: chartConfig.timeframe,
    onCandleUpdate: handleCandleUpdate,
    onPriceUpdate: handlePriceUpdate,
    onError: handleWebSocketError,
    enabled: isReady && !!chartConfig.symbol
  });

  // Fetch initial historical data
  const fetchInitialData = useCallback(async () => {
    if (!chartConfig.symbol) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Get historical data from API to populate the chart
      const res = await priceService.getCandles({ 
        symbol: chartConfig.symbol, 
        interval: chartConfig.timeframe, 
        limit: 500 
      });
      
      console.log(`📈 Initial API Response for ${chartConfig.symbol}:`, {
        status: res?.status,
        data: res?.data,
        candles: res?.data?.data,
        length: res?.data?.data?.length
      });
      
      const rawData = res?.data?.data || [];
      
      // Convert API data to LightweightCharts format
      const data = rawData.map(candle => {
        try {
          return {
            time: Math.floor(candle.close_time / 1000),
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
      }).filter(Boolean);
      
      // Sort and deduplicate
      data.sort((a, b) => a.time - b.time);
      const uniqueData = [];
      const seenTimes = new Set();
      
      for (const candle of data) {
        if (!seenTimes.has(candle.time)) {
          seenTimes.add(candle.time);
          uniqueData.push(candle);
        }
      }
      
      console.log(`🔄 Converted ${uniqueData.length} candles for ${chartConfig.symbol}`);
      
      if (uniqueData.length > 0) {
        setCurrentPrice(uniqueData[uniqueData.length - 1].close);
      }
      
      setCandles(uniqueData);
      
      // Update chart with historical data
      if (candleSeriesRef.current && volumeSeriesRef.current) {
        candleSeriesRef.current.setData(uniqueData);
        
        // Set volume data
        const volumeData = uniqueData.map(candle => ({
          time: candle.time,
          value: candle.volume,
          color: candle.close > candle.open ? '#00C85180' : '#ff444480'
        }));
        volumeSeriesRef.current.setData(volumeData);
        
        // Update indicators with historical data
        updateIndicators(uniqueData);
      }
      
    } catch (e) {
      console.error(`❌ Error fetching initial data for ${chartConfig.symbol}:`, e);
      setError(e.message || 'Failed to load initial data');
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
        case 'BOLL':
          const bollData = calculateBollingerBands(data, indicator.period, indicator.stdDev || 2);
          // Upper band
          const upperBand = chartRef.current.addLineSeries({
            color: indicator.color || '#2196F3',
            lineWidth: 1,
            title: `BOLL Upper(${indicator.period})`
          });
          upperBand.setData(bollData.upper);
          indicatorSeriesRef.current[`${indicator.type}_upper_${indicator.period}`] = upperBand;
          
          // Middle band (SMA)
          const middleBand = chartRef.current.addLineSeries({
            color: indicator.color || '#FF9800',
            lineWidth: 2,
            title: `BOLL Middle(${indicator.period})`
          });
          middleBand.setData(bollData.middle);
          indicatorSeriesRef.current[`${indicator.type}_middle_${indicator.period}`] = middleBand;
          
          // Lower band
          const lowerBand = chartRef.current.addLineSeries({
            color: indicator.color || '#2196F3',
            lineWidth: 1,
            title: `BOLL Lower(${indicator.period})`
          });
          lowerBand.setData(bollData.lower);
          indicatorSeriesRef.current[`${indicator.type}_lower_${indicator.period}`] = lowerBand;
          
          series = null; // Don't set single series for BOLL
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

  const calculateBollingerBands = (data, period = 20, stdDev = 2) => {
    const upper = [];
    const middle = [];
    const lower = [];
    
    for (let i = period - 1; i < data.length; i++) {
      const slice = data.slice(i - period + 1, i + 1);
      const sma = slice.reduce((acc, candle) => acc + candle.close, 0) / period;
      
      const variance = slice.reduce((acc, candle) => acc + Math.pow(candle.close - sma, 2), 0) / period;
      const standardDeviation = Math.sqrt(variance);
      
      const time = data[i].time;
      middle.push({ time, value: sma });
      upper.push({ time, value: sma + (standardDeviation * stdDev) });
      lower.push({ time, value: sma - (standardDeviation * stdDev) });
    }
    
    return { upper, middle, lower };
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
    let isMounted = true;
    let resizeHandler = null;
    let resizeObserver = null;

    const initChart = async () => {
      if (!containerRef.current || !isMounted) return;
      
      // Clean up existing chart first
      if (chartRef.current) {
        try {
          chartRef.current.remove();
        } catch (e) {
          console.warn('Error removing existing chart:', e);
        }
        chartRef.current = null;
        candleSeriesRef.current = null;
        volumeSeriesRef.current = null;
        indicatorSeriesRef.current = {};
      }
      
      try {
        const { createChart } = await import('lightweight-charts');
        
        if (!isMounted || !containerRef.current) return;
        
        const chart = createChart(containerRef.current, {
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
          layout: {
            background: { color: isDarkMode ? '#1f2937' : '#ffffff' },
            textColor: isDarkMode ? '#e5e7eb' : '#333'
          },
          grid: {
            vertLines: { color: isDarkMode ? '#374151' : '#f0f0f0' },
            horzLines: { color: isDarkMode ? '#374151' : '#f0f0f0' }
          },
          rightPriceScale: {
            borderVisible: false,
            textColor: isDarkMode ? '#e5e7eb' : '#333',
          },
          timeScale: {
            borderVisible: false,
            timeVisible: true,
            secondsVisible: false,
            textColor: isDarkMode ? '#e5e7eb' : '#333',
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

        if (!isMounted) {
          chart.remove();
          return;
        }

        chartRef.current = chart;
        candleSeriesRef.current = candleSeries;
        volumeSeriesRef.current = volumeSeries;
        setIsReady(true);

        resizeHandler = () => {
          if (containerRef.current && chartRef.current && isMounted) {
            // Use ResizeObserver for better resize detection
            requestAnimationFrame(() => {
              if (containerRef.current && chartRef.current && isMounted) {
                const rect = containerRef.current.getBoundingClientRect();
                chart.applyOptions({
                  width: Math.max(rect.width, 300), // Minimum width
                  height: Math.max(rect.height, 200), // Minimum height
                });
              }
            });
          }
        };
        
        // Use ResizeObserver for better resize detection
        if (window.ResizeObserver && containerRef.current) {
          resizeObserver = new ResizeObserver(resizeHandler);
          resizeObserver.observe(containerRef.current);
        }
        
        window.addEventListener('resize', resizeHandler);
        
        // Initial resize after mount
        setTimeout(() => {
          if (isMounted) {
            resizeHandler();
          }
        }, 100);
        
      } catch (error) {
        console.error('Failed to initialize chart:', error);
      }
    };

    initChart();

    return () => {
      isMounted = false;
      setIsReady(false);
      
      if (resizeHandler) {
        window.removeEventListener('resize', resizeHandler);
      }
      
      // Cleanup ResizeObserver
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      
      if (chartRef.current) {
        try {
          chartRef.current.remove();
        } catch (e) {
          console.warn('Error removing chart in cleanup:', e);
        }
        chartRef.current = null;
        candleSeriesRef.current = null;
        volumeSeriesRef.current = null;
        indicatorSeriesRef.current = {};
      }
    };
  }, []);

  // Fetch initial data when chart is ready
  useEffect(() => {
    if (isReady) {
      fetchInitialData();
    }
  }, [isReady, chartConfig.symbol, chartConfig.timeframe, fetchInitialData]);

  // Update indicators when indicators config changes
  useEffect(() => {
    if (isReady && candles.length > 0) {
      updateIndicators(candles);
    }
  }, [isReady, chartConfig.indicators, updateIndicators, candles]);

  // Update chart theme when dark mode changes
  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.applyOptions({
        layout: {
          background: { color: isDarkMode ? '#1f2937' : '#ffffff' },
          textColor: isDarkMode ? '#e5e7eb' : '#333'
        },
        grid: {
          vertLines: { color: isDarkMode ? '#374151' : '#f0f0f0' },
          horzLines: { color: isDarkMode ? '#374151' : '#f0f0f0' }
        },
        rightPriceScale: {
          borderVisible: false,
          textColor: isDarkMode ? '#e5e7eb' : '#333',
        },
        timeScale: {
          borderVisible: false,
          timeVisible: true,
          secondsVisible: false,
          textColor: isDarkMode ? '#e5e7eb' : '#333',
        }
      });
    }
  }, [isDarkMode]);

  // Handle adding new indicator
  const handleAddIndicator = (indicatorConfig) => {
    const newIndicators = [...chartConfig.indicators, {
      ...indicatorConfig,
      id: Date.now(), // Simple ID generation
      color: indicatorConfig.color || getRandomColor()
    }];
    
    onConfigChange({
      ...chartConfig,
      indicators: newIndicators
    });
    
    setShowIndicatorSelector(false);
  };

  // Handle removing indicator
  const handleRemoveIndicator = (indicatorId) => {
    const newIndicators = chartConfig.indicators.filter(ind => ind.id !== indicatorId);
    onConfigChange({
      ...chartConfig,
      indicators: newIndicators
    });
  };

  // Generate random color for indicators
  const getRandomColor = () => {
    const colors = ['#2196F3', '#FF9800', '#4CAF50', '#9C27B0', '#F44336', '#00BCD4'];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  const priceChange = candles.length > 1 ? currentPrice - candles[candles.length - 2].close : 0;
  const priceChangePercent = candles.length > 1 ? (priceChange / candles[candles.length - 2].close) * 100 : 0;

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm h-full flex flex-col transition-colors duration-200" style={{ height: height + 120 }}>
      {/* Drag Handle - ONLY this area can drag the chart */}
      <div className="drag-handle flex items-center justify-between p-2 bg-gray-700 border-b border-gray-600 rounded-t-lg">
        <div className="flex items-center gap-2 flex-1">
          <select 
            value={chartConfig.symbol} 
            onChange={(e) => {
              e.stopPropagation();
              onConfigChange({...chartConfig, symbol: e.target.value});
            }}
            onMouseDown={(e) => e.stopPropagation()}
            className="px-1 py-0.5 border border-gray-600 rounded text-xs bg-gray-700 text-gray-100"
          >
            <option value="BTCUSDT">BTC/USDT</option>
            <option value="ETHUSDT">ETH/USDT</option>
            <option value="ADAUSDT">ADA/USDT</option>
            <option value="BNBUSDT">BNB/USDT</option>
            <option value="DOGEUSDT">DOGE/USDT</option>
            <option value="SOLUSDT">SOL/USDT</option>
          </select>
          
          <select 
            value={chartConfig.timeframe} 
            onChange={(e) => {
              e.stopPropagation();
              onConfigChange({...chartConfig, timeframe: e.target.value});
            }}
            onMouseDown={(e) => e.stopPropagation()}
            className="px-1 py-0.5 border border-gray-600 rounded text-xs bg-gray-700 text-gray-100"
          >
            <option value="1m">1m</option>
            <option value="5m">5m</option>
            <option value="15m">15m</option>
            <option value="1h">1h</option>
            <option value="4h">4h</option>
            <option value="1d">1d</option>
          </select>

          {isConnected && (
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
          )}
        </div>
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Remove button clicked for chart:', chartConfig.id);
            onRemove();
          }}
          onMouseDown={(e) => {
            e.stopPropagation(); // Prevent drag from starting
          }}
          className="text-gray-400 hover:text-red-400 p-1 rounded flex items-center justify-center text-xs"
          title="Remove chart"
        >
          ✕
        </button>
      </div>

      <ChartHeader 
        chartConfig={chartConfig}
        onConfigChange={onConfigChange}
        onRemove={onRemove}
        isLoading={isLoading}
        error={error}
        currentPrice={currentPrice}
        priceChange={priceChange}
        priceChangePercent={priceChangePercent}
        onShowIndicatorSelector={() => setShowIndicatorSelector(true)}
        onRemoveIndicator={handleRemoveIndicator}
        isConnected={isConnected}
      />

      {/* Chart Container - This area should NOT be draggable */}
      <div 
        ref={containerRef} 
        style={{ height: height, width: '100%' }}
        key={`container-${chartConfig.id || Date.now()}`}
        className="flex-1 chart-interactive-area"
        onMouseDown={(e) => {
          // Explicitly prevent any drag events from starting in chart area
          e.stopPropagation();
        }}
        onDragStart={(e) => {
          e.preventDefault();
          return false;
        }}
      ></div>

      {/* Indicator Selector Modal */}
      {showIndicatorSelector && (
        <IndicatorSelector
          onAddIndicator={handleAddIndicator}
          onClose={() => setShowIndicatorSelector(false)}
          existingIndicators={chartConfig.indicators}
        />
      )}
    </div>
  );
};

export default TradingChart;
