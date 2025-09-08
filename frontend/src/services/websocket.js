// WebSocket service for real-time price data
class WebSocketService {
  constructor() {
    this.connections = new Map();
    this.reconnectAttempts = new Map();
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 3000;
    this.baseURL = process.env.REACT_APP_WS_URL || 'ws://localhost:8001';
  }

  // Connect to price stream for a specific symbol
  connectPrice(symbol, onMessage, onError, onClose) {
    const key = `price_${symbol}`;
    this.disconnect(key);

    const url = `${this.baseURL}/ws/price?symbol=${symbol}`;
    return this._connect(key, url, onMessage, onError, onClose);
  }

  // Connect to candle stream for a specific symbol and interval
  connectCandle(symbol, interval, onMessage, onError, onClose) {
    const key = `candle_${symbol}_${interval}`;
    this.disconnect(key);

    const url = `${this.baseURL}/ws/candle?symbol=${symbol}&interval=${interval}`;
    return this._connect(key, url, onMessage, onError, onClose);
  }

  // Connect to market snapshot for multiple symbols
  connectMarketSnapshot(symbols, onMessage, onError, onClose) {
    const key = `market_snapshot_${symbols.join(',')}`;
    this.disconnect(key);

    const symbolsParam = symbols.join(',');
    const url = `${this.baseURL}/ws/market_snapshot?symbols=${symbolsParam}`;
    return this._connect(key, url, onMessage, onError, onClose);
  }

  // Connect to top movers stream
  connectTopMovers(limit = 10, onMessage, onError, onClose) {
    const key = `top_movers`;
    this.disconnect(key);

    const url = `${this.baseURL}/ws/top_movers?limit=${limit}`;
    return this._connect(key, url, onMessage, onError, onClose);
  }

  // Generic connection method
  _connect(key, url, onMessage, onError, onClose) {
    try {
      console.log(`🔌 Connecting to WebSocket: ${url}`);
      
      const ws = new WebSocket(url);
      this.connections.set(key, ws);
      this.reconnectAttempts.set(key, 0);

      ws.onopen = () => {
        console.log(`✅ WebSocket connected: ${key}`);
        this.reconnectAttempts.set(key, 0);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log(`📨 WebSocket message for ${key}:`, data);
          if (onMessage) onMessage(data);
        } catch (error) {
          console.error(`❌ Error parsing WebSocket message for ${key}:`, error);
          if (onError) onError(error);
        }
      };

      ws.onerror = (error) => {
        console.error(`❌ WebSocket error for ${key}:`, error);
        if (onError) onError(error);
      };

      ws.onclose = (event) => {
        console.log(`🔌 WebSocket closed for ${key}:`, event.code, event.reason);
        this.connections.delete(key);
        
        if (onClose) onClose(event);
        
        // Auto-reconnect if not a clean close
        if (event.code !== 1000 && event.code !== 1001) {
          this._attemptReconnect(key, url, onMessage, onError, onClose);
        }
      };

      return ws;
    } catch (error) {
      console.error(`❌ Failed to create WebSocket connection for ${key}:`, error);
      if (onError) onError(error);
      return null;
    }
  }

  // Attempt to reconnect
  _attemptReconnect(key, url, onMessage, onError, onClose) {
    const attempts = this.reconnectAttempts.get(key) || 0;
    
    if (attempts < this.maxReconnectAttempts) {
      const delay = this.reconnectDelay * Math.pow(2, attempts); // Exponential backoff
      console.log(`🔄 Attempting to reconnect ${key} in ${delay}ms (attempt ${attempts + 1}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        this.reconnectAttempts.set(key, attempts + 1);
        this._connect(key, url, onMessage, onError, onClose);
      }, delay);
    } else {
      console.error(`❌ Max reconnection attempts reached for ${key}`);
      this.reconnectAttempts.delete(key);
    }
  }

  // Disconnect a specific connection
  disconnect(key) {
    const ws = this.connections.get(key);
    if (ws) {
      console.log(`🔌 Disconnecting WebSocket: ${key}`);
      ws.close(1000, 'Manual disconnect');
      this.connections.delete(key);
      this.reconnectAttempts.delete(key);
    }
  }

  // Disconnect all connections
  disconnectAll() {
    console.log(`🔌 Disconnecting all WebSocket connections`);
    this.connections.forEach((ws, key) => {
      ws.close(1000, 'Disconnect all');
    });
    this.connections.clear();
    this.reconnectAttempts.clear();
  }

  // Get connection status
  getConnectionStatus(key) {
    const ws = this.connections.get(key);
    if (!ws) return 'disconnected';
    
    switch (ws.readyState) {
      case WebSocket.CONNECTING:
        return 'connecting';
      case WebSocket.OPEN:
        return 'connected';
      case WebSocket.CLOSING:
        return 'closing';
      case WebSocket.CLOSED:
        return 'disconnected';
      default:
        return 'unknown';
    }
  }

  // Check if connected
  isConnected(key) {
    return this.getConnectionStatus(key) === 'connected';
  }
}

// Create singleton instance
const websocketService = new WebSocketService();

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  websocketService.disconnectAll();
});

export default websocketService;
