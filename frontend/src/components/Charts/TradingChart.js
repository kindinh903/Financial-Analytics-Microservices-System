import React, { useEffect, useRef, useState, useCallback } from 'react';
import { priceService } from '../../services/api';
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
      
      // Remove duplicates and ensure unique timestamps
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
        console.log(`📊 First converted candle:`, uniqueData[0]);
        console.log(`📊 Last converted candle:`, uniqueData[uniqueData.length - 1]);
      }
      
      setCandles(uniqueData);
      
      // Update chart with real data
      if (candleSeriesRef.current && volumeSeriesRef.current) {
        candleSeriesRef.current.setData(uniqueData);
        
        // Set volume data
        const volumeData = uniqueData.map(candle => ({
          time: candle.time,
          value: candle.volume,
          color: candle.close > candle.open ? '#00C85180' : '#ff444480'
        }));
        volumeSeriesRef.current.setData(volumeData);
        
        // Update indicators with real data
        updateIndicators(uniqueData);
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
    const initChart = async () => {
      if (!containerRef.current) return;
      
      try {
        const { createChart } = await import('lightweight-charts');
        const chart = createChart(containerRef.current, {
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
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

        const handleResize = () => {
          if (containerRef.current && chartRef.current) {
            chart.applyOptions({
              width: containerRef.current.clientWidth,
              height: containerRef.current.clientHeight,
            });
          }
        };
        
        window.addEventListener('resize', handleResize);
        
        // Initial resize after mount
        setTimeout(handleResize, 100);
        
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

  const currentPrice = candles.length > 0 ? candles[candles.length - 1].close : 0;
  const priceChange = candles.length > 1 ? currentPrice - candles[candles.length - 2].close : 0;
  const priceChangePercent = candles.length > 1 ? (priceChange / candles[candles.length - 2].close) * 100 : 0;

  return (
    <div className="bg-white border rounded-lg shadow-sm" style={{ height: height + 120 }}>
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
      />

      {/* Chart Container */}
      <div ref={containerRef} style={{ height: height, width: '100%' }}></div>

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
