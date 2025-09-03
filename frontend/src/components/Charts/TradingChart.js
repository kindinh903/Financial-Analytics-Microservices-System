import React, { useEffect, useRef, useState, useCallback } from 'react';
import { priceService } from '../../services/api';
import ChartHeader from './ChartHeader';
import IndicatorsPanel from './IndicatorsPanel';

const TradingChart = ({ chartConfig, onRemove, onConfigChange, height = 400 }) => {
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
      />

      <IndicatorsPanel 
        indicators={chartConfig.indicators}
        onConfigChange={onConfigChange}
        chartConfig={chartConfig}
      />

      {/* Chart Container */}
      <div ref={containerRef} style={{ height: height, width: '100%' }}></div>
    </div>
  );
};

export default TradingChart;
