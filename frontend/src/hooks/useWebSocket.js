import { useEffect, useCallback, useRef } from 'react';
import websocketService from '../services/websocket';

/**
 * Custom hook for managing WebSocket connections for trading charts
 * @param {string} symbol - Trading symbol (e.g., 'BTCUSDT')
 * @param {string} interval - Time interval (e.g., '5m', '1h')
 * @param {Function} onCandleUpdate - Callback for candle updates
 * @param {Function} onPriceUpdate - Callback for price updates
 * @param {Function} onError - Callback for errors
 * @param {boolean} enabled - Whether to enable the connection
 */
export const useWebSocketChart = ({
  symbol,
  interval,
  onCandleUpdate,
  onPriceUpdate,
  onError,
  enabled = true
}) => {
  const connectionRef = useRef({
    candle: null,
    price: null,
    isConnected: false
  });

  const connect = useCallback(() => {
    if (!symbol || !interval || !enabled) return;

    console.log(`🔌 Connecting WebSocket for ${symbol} - ${interval}`);

    // Connect to candle stream
    if (onCandleUpdate) {
      connectionRef.current.candle = websocketService.connectCandle(
        symbol,
        interval,
        onCandleUpdate,
        onError,
        () => {
          connectionRef.current.isConnected = false;
        }
      );
    }

    // Connect to price stream
    if (onPriceUpdate) {
      connectionRef.current.price = websocketService.connectPrice(
        symbol,
        onPriceUpdate,
        onError,
        () => {
          connectionRef.current.isConnected = false;
        }
      );
    }

    connectionRef.current.isConnected = true;
  }, [symbol, interval, onCandleUpdate, onPriceUpdate, onError, enabled]);

  const disconnect = useCallback(() => {
    console.log(`🔌 Disconnecting WebSocket for ${symbol} - ${interval}`);
    
    if (symbol && interval) {
      websocketService.disconnect(`candle_${symbol}_${interval}`);
    }
    if (symbol) {
      websocketService.disconnect(`price_${symbol}`);
    }
    
    connectionRef.current.candle = null;
    connectionRef.current.price = null;
    connectionRef.current.isConnected = false;
  }, [symbol, interval]);

  const getConnectionStatus = useCallback(() => {
    if (!symbol) return 'disconnected';
    
    const candleStatus = websocketService.getConnectionStatus(`candle_${symbol}_${interval}`);
    const priceStatus = websocketService.getConnectionStatus(`price_${symbol}`);
    
    // Return connected if at least one connection is active
    return (candleStatus === 'connected' || priceStatus === 'connected') ? 'connected' : candleStatus;
  }, [symbol, interval]);

  const isConnected = useCallback(() => {
    return getConnectionStatus() === 'connected';
  }, [getConnectionStatus]);

  // Effect to manage connections
  useEffect(() => {
    if (enabled) {
      connect();
    } else {
      disconnect();
    }

    // Cleanup on unmount
    return () => {
      disconnect();
    };
  }, [connect, disconnect, enabled]);

  // Effect to reconnect when symbol or interval changes
  useEffect(() => {
    if (enabled) {
      disconnect();
      // Small delay to ensure cleanup before reconnecting
      const timer = setTimeout(connect, 100);
      return () => clearTimeout(timer);
    }
  }, [symbol, interval]);

  return {
    connect,
    disconnect,
    isConnected: isConnected(),
    connectionStatus: getConnectionStatus()
  };
};

/**
 * Hook for market data WebSocket connections
 */
export const useWebSocketMarket = ({
  symbols = [],
  onMarketSnapshot,
  onTopMovers,
  onError,
  enabled = true,
  topMoversLimit = 10
}) => {
  const connect = useCallback(() => {
    if (!enabled) return;

    console.log(`🔌 Connecting to market WebSocket`);

    // Connect to market snapshot if symbols provided
    if (symbols.length > 0 && onMarketSnapshot) {
      websocketService.connectMarketSnapshot(
        symbols,
        onMarketSnapshot,
        onError,
        () => console.log('Market snapshot connection closed')
      );
    }

    // Connect to top movers if callback provided
    if (onTopMovers) {
      websocketService.connectTopMovers(
        topMoversLimit,
        onTopMovers,
        onError,
        () => console.log('Top movers connection closed')
      );
    }
  }, [symbols, onMarketSnapshot, onTopMovers, onError, enabled, topMoversLimit]);

  const disconnect = useCallback(() => {
    console.log(`🔌 Disconnecting market WebSocket`);
    
    if (symbols.length > 0) {
      websocketService.disconnect(`market_snapshot_${symbols.join(',')}`);
    }
    websocketService.disconnect('top_movers');
  }, [symbols]);

  useEffect(() => {
    if (enabled) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [connect, disconnect, enabled]);

  return {
    connect,
    disconnect
  };
};
