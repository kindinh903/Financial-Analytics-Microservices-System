import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createChart } from 'lightweight-charts';
import './TradingChart.css';

const TradingChart = ({ 
  symbol = 'BTCUSDT', 
  interval = '1m', 
  theme = 'dark',
  height = 400,
  showVolume = true,
  showGrid = true,
  showLegend = true
}) => {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const candlestickSeriesRef = useRef(null);
  const volumeSeriesRef = useRef(null);
  const wsRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastPrice, setLastPrice] = useState(null);
  const [priceChange, setPriceChange] = useState(0);
  const [priceChangePercent, setPriceChangePercent] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Chart configuration
  const chartOptions = {
    layout: {
      background: { type: 'solid', color: theme === 'dark' ? '#1e222d' : '#ffffff' },
      textColor: theme === 'dark' ? '#d1d4dc' : '#131722',
    },
    grid: {
      vertLines: { color: theme === 'dark' ? '#2B2B43' : '#e1e3e6', visible: showGrid },
      horzLines: { color: theme === 'dark' ? '#2B2B43' : '#e1e3e6', visible: showGrid },
    },
    crosshair: {
      mode: 1,
    },
    rightPriceScale: {
      borderColor: theme === 'dark' ? '#2B2B43' : '#e1e3e6',
    },
    timeScale: {
      borderColor: theme === 'dark' ? '#2B2B43' : '#e1e3e6',
      timeVisible: true,
      secondsVisible: false,
    },
    handleScroll: {
      mouseWheel: true,
      pressedMouseMove: true,
    },
    handleScale: {
      axisPressedMouseMove: true,
      mouseWheel: true,
      pinch: true,
    },
  };

  // Initialize chart
  const initializeChart = useCallback(() => {
    if (!chartContainerRef.current) return;

    // Create chart
    const chart = createChart(chartContainerRef.current, {
      ...chartOptions,
      width: chartContainerRef.current.clientWidth,
      height: height,
    });

    // Create candlestick series
    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    });

    // Create volume series if enabled
    let volumeSeries = null;
    if (showVolume) {
      volumeSeries = chart.addHistogramSeries({
        color: '#26a69a',
        priceFormat: {
          type: 'volume',
        },
        priceScaleId: '',
        scaleMargins: {
          top: 0.8,
          bottom: 0,
        },
      });
    }

    // Store references
    chartRef.current = chart;
    candlestickSeriesRef.current = candlestickSeries;
    volumeSeriesRef.current = volumeSeries;

    // Handle resize
    const handleResize = () => {
      if (chartRef.current && chartContainerRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
      }
    };
  }, [theme, height, showVolume, showGrid]);

  // Load historical data
  const loadHistoricalData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(
        `http://localhost:8081/api/historical/${symbol}?interval=${interval}&limit=1000`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.data && data.data.length > 0) {
        // Transform data for TradingView
        const candlestickData = data.data.map(candle => ({
          time: Math.floor(candle.timestamp / 1000),
          open: candle.open,
          high: candle.high,
          low: candle.low,
          close: candle.close,
        }));

        const volumeData = data.data.map(candle => ({
          time: Math.floor(candle.timestamp / 1000),
          value: candle.volume,
          color: candle.close >= candle.open ? '#26a69a' : '#ef5350',
        }));

        // Set data
        if (candlestickSeriesRef.current) {
          candlestickSeriesRef.current.setData(candlestickData);
        }

        if (volumeSeriesRef.current && showVolume) {
          volumeSeriesRef.current.setData(volumeData);
        }

        // Set last price and calculate change
        const latest = data.data[0];
        const previous = data.data[1];
        
        if (latest && previous) {
          setLastPrice(latest.close);
          setPriceChange(latest.close - previous.close);
          setPriceChangePercent(((latest.close - previous.close) / previous.close) * 100);
        }

        // Fit content
        if (chartRef.current) {
          chartRef.current.timeScale().fitContent();
        }
      }
    } catch (err) {
      console.error('Error loading historical data:', err);
      setError('Failed to load historical data');
    } finally {
      setIsLoading(false);
    }
  }, [symbol, interval, showVolume]);

  // WebSocket connection
  const connectWebSocket = useCallback(() => {
    try {
      const ws = new WebSocket('ws://localhost:8081/ws');
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        console.log('WebSocket connected');
        
        // Subscribe to symbol updates
        ws.send(JSON.stringify({
          type: 'subscribe',
          trading_pairs: [symbol]
        }));
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          if (message.type === 'price_update' && message.data.symbol === symbol) {
            const priceData = message.data;
            
            // Update last price
            setLastPrice(priceData.close);
            
            // Add new candle if it's a completed candle
            if (priceData.close_time && candlestickSeriesRef.current) {
              const newCandle = {
                time: Math.floor(priceData.timestamp / 1000),
                open: priceData.open,
                high: priceData.high,
                low: priceData.low,
                close: priceData.close,
              };

              candlestickSeriesRef.current.update(newCandle);

              // Update volume if enabled
              if (volumeSeriesRef.current && showVolume) {
                const newVolume = {
                  time: Math.floor(priceData.timestamp / 1000),
                  value: priceData.volume,
                  color: priceData.close >= priceData.open ? '#26a69a' : '#ef5350',
                };
                volumeSeriesRef.current.update(newVolume);
              }
            }
          }
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        console.log('WebSocket disconnected');
        
        // Reconnect after delay
        setTimeout(() => {
          if (wsRef.current) {
            connectWebSocket();
          }
        }, 5000);
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsConnected(false);
      };

    } catch (err) {
      console.error('Error connecting WebSocket:', err);
      setIsConnected(false);
    }
  }, [symbol, showVolume]);

  // Initialize chart and load data
  useEffect(() => {
    const cleanup = initializeChart();
    
    if (cleanup) {
      return cleanup;
    }
  }, [initializeChart]);

  useEffect(() => {
    loadHistoricalData();
  }, [loadHistoricalData]);

  useEffect(() => {
    connectWebSocket();
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connectWebSocket]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (chartRef.current) {
        chartRef.current.remove();
      }
    };
  }, []);

  return (
    <div className="trading-chart-container">
      {/* Chart Header */}
      <div className="chart-header">
        <div className="symbol-info">
          <h3 className="symbol">{symbol}</h3>
          {lastPrice && (
            <div className="price-info">
              <span className="price">${lastPrice.toFixed(2)}</span>
              <span className={`price-change ${priceChange >= 0 ? 'positive' : 'negative'}`}>
                {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)} ({priceChangePercent.toFixed(2)}%)
              </span>
            </div>
          )}
        </div>
        
        <div className="chart-controls">
          <div className="connection-status">
            <span className={`status-dot ${isConnected ? 'connected' : 'disconnected'}`}></span>
            {isConnected ? 'Live' : 'Disconnected'}
          </div>
          
          <div className="interval-selector">
            <select 
              value={interval} 
              onChange={(e) => window.location.href = `?symbol=${symbol}&interval=${e.target.value}`}
            >
              <option value="1m">1m</option>
              <option value="5m">5m</option>
              <option value="15m">15m</option>
              <option value="1h">1h</option>
              <option value="4h">4h</option>
              <option value="1d">1d</option>
            </select>
          </div>
        </div>
      </div>

      {/* Chart Container */}
      <div className="chart-wrapper">
        {isLoading && (
          <div className="loading-overlay">
            <div className="spinner"></div>
            <span>Loading chart data...</span>
          </div>
        )}
        
        {error && (
          <div className="error-overlay">
            <span className="error-message">{error}</span>
            <button onClick={loadHistoricalData} className="retry-button">
              Retry
            </button>
          </div>
        )}
        
        <div 
          ref={chartContainerRef} 
          className="chart-container"
          style={{ height: `${height}px` }}
        />
      </div>

      {/* Chart Legend */}
      {showLegend && (
        <div className="chart-legend">
          <div className="legend-item">
            <span className="legend-color positive"></span>
            <span>Bullish</span>
          </div>
          <div className="legend-item">
            <span className="legend-color negative"></span>
            <span>Bearish</span>
          </div>
          {showVolume && (
            <div className="legend-item">
              <span className="legend-color volume"></span>
              <span>Volume</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TradingChart;
