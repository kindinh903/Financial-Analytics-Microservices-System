import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // Increased timeout to 30 seconds for crawler operations
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Đảm bảo cookies được gửi cùng với requests
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor với auto refresh token
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Thử refresh token
        console.log('Access token expired, attempting to refresh...');
        const refreshResponse = await api.post('/api/auth/refresh');
        
        if (refreshResponse.data.accessToken) {
          // Lưu access token mới
          localStorage.setItem('accessToken', refreshResponse.data.accessToken);
          
          // Cập nhật header cho request ban đầu
          originalRequest.headers.Authorization = `Bearer ${refreshResponse.data.accessToken}`;
          
          console.log('Token refreshed successfully, retrying original request');
          return api(originalRequest);
        }
      } catch (refreshError) {
        console.log('Refresh token failed:', refreshError);
        // Refresh thất bại, redirect to login
        localStorage.removeItem('accessToken');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    // Nếu không phải 401 hoặc đã retry rồi mà vẫn lỗi
    if (error.response?.status === 401) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    
    return Promise.reject(error);
  }
);

// Health check endpoints
export const healthCheck = {
  gateway: () => api.get('/health'),
  auth: () => api.get('/api/auth/health'),
  price: () => api.get('/api/price/health'),
  news: () => api.get('/api/news/health'),
  user: () => api.get('/api/user/health'),
  crawler: () => api.get('/health/crawler'),
};

// Price service endpoints
export const priceService = {
  // Get historical price data
  getHistoricalData: (symbol, timeframe, limit = 100) =>
    api.get(`/api/price/historical/${symbol}`, {
      params: { timeframe, limit },
    }),

  // Get candles (new preferred endpoint)
  getCandles: ({ symbol, interval = '1h', limit = 500, start_time, end_time }) =>
    api.get('/api/price/candles', {
      params: { symbol, interval, limit, start_time, end_time },
    }),

  // Get real-time price
  getRealTimePrice: (symbol) =>
    api.get(`/api/price/realtime/${symbol}`),

  // Get price summary
  getPriceSummary: (symbol) =>
    api.get(`/api/price/summary/${symbol}`),

  // Get available symbols
  getAvailableSymbols: () =>
    api.get('/api/price/symbol'),

  // Get market overview
  getMarketOverview: () =>
    api.get('/api/price/market-overview'),
};

// Auth service endpoints
export const authService = {
  login: (credentials) =>
    api.post('/api/auth/login', credentials),

  register: (userData) =>
    api.post('/api/auth/register', userData),

  refreshToken: () =>
    api.post('/api/auth/refresh'), // Không cần gửi refreshToken trong body nữa, sẽ lấy từ cookie

  logout: () =>
    api.post('/api/auth/logout'),
};

// User service endpoints
export const userService = {
  getProfile: () =>
    api.get('/api/user/profile'),

  updateProfile: (profileData) =>
    api.put('/api/user/profile', profileData),

  getPortfolio: () =>
    api.get('/api/user/portfolio'),

  addToPortfolio: (portfolioItem) =>
    api.post('/api/user/portfolio', portfolioItem),

  // ✅ Thêm endpoint upload avatar (nếu cần)
  uploadAvatar: (formData) =>
    api.post('/api/user/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }),

  // ✅ Thêm endpoint cập nhật preferences
  updatePreferences: (preferences) =>
    api.put('/api/user/preferences', preferences),

  // ✅ Thêm endpoint cập nhật address
  updateAddress: (address) =>
    api.put('/api/user/address', address),

  // Admin endpoints
  getAllUsers: (params = {}) =>
    api.get('/api/user/admin/users', { params }),

  getUserById: (userId) =>
    api.get(`/api/user/admin/users/${userId}`),

  updateUser: (userId, userData) =>
    api.put(`/api/user/admin/users/${userId}`, userData),

  createUser: (userData) =>
    api.post('/api/user/admin/users', userData),

  deleteUser: (userId) =>
    api.delete(`/api/user/admin/users/${userId}`),

  getAdminStats: () =>
    api.get('/api/user/admin/stats'),

  getSystemLogs: (params = {}) =>
    api.get('/api/user/admin/logs', { params }),

  updateSystemSettings: (settings) =>
    api.put('/api/user/admin/settings', settings),
};

// News service endpoints
export const newsService = {
  getNews: (params = {}) =>
    api.get('/api/news', { params }),

  getNewsBySymbol: (symbol) =>
    api.get(`/api/news/symbol/${symbol}`),

  getNewsCategories: () =>
    api.get('/api/news/categories'),
};

// Backtest service endpoints
export const backtestService = {
  // Run a new backtest
  runBacktest: (backtestRequest) =>
    api.post('/api/backtest', backtestRequest),

  // Get a specific backtest result by ID
  getBacktestResult: (id) =>
    api.get(`/api/backtest/${id}`),

  // Get all backtest results with optional filtering
  getBacktestResults: (params = {}) =>
    api.get('/api/backtest', { params }),

  // Delete a backtest result
  deleteBacktestResult: (id) =>
    api.delete(`/api/backtest/${id}`),

  // Note: Backend doesn't have these endpoints yet, commented out
  // // Get available trading strategies
  // getAvailableStrategies: () =>
  //   api.get('/api/backtest/strategies'),

  // // Get strategy information by name
  // getStrategyInfo: (strategyName) =>
  //   api.get(`/api/backtest/strategies/${strategyName}`),

  // Get backtest statistics summary
  getBacktestStats: (params = {}) =>
    api.get('/api/backtest/stats', { params }),
};

// AI Predict service endpoints
export const aiPredictService = {
  // Get AI price prediction
  predictPrice: (data) =>
    api.post('/api/ai-predict/predict', data),

  // Health check
  health: () =>
    api.get('/api/ai-predict/health'),
};

// Crawler service endpoints
export const crawlerService = {
  // Enhanced crawl
  enhancedCrawl: (data) =>
    api.post('/api/crawler/crawl/enhanced', data),

  // Get trending headlines
  getTrending: (forceRefresh = false) =>
    api.get('/api/crawler/trending', { params: { force_refresh: forceRefresh } }),

  // Get latest news
  getLatestNews: (symbol = 'BTCUSDT', limit = 20) =>
    api.get('/api/crawler/news/latest', { params: { symbol, limit } }),

  // Get enhanced news
  getEnhancedNews: (symbol = 'BTCUSDT', limit = 20) =>
    api.get('/api/crawler/news/enhanced', { params: { symbol, limit } }),

  // Get stored news (no crawling)
  getStoredNews: (symbol = 'BTCUSDT', limit = 50) =>
    api.get('/api/crawler/news/stored', { params: { symbol, limit } }),

  // Analyze sentiment
  analyzeSentiment: (text) =>
    api.get('/api/crawler/sentiment/analyze', { params: { text } }),

  // Get news sources
  getNewsSources: () =>
    api.get('/api/crawler/news/sources'),

  // Get sentiment summary
  getSentimentSummary: (symbol, days = 7) =>
    api.get(`/api/crawler/data/sentiment/summary/${symbol}`, { params: { days } }),

  // Export CSV
  exportSentimentCSV: (symbol, days = 30) =>
    api.get(`/api/crawler/data/export/csv/${symbol}`, { params: { days } }),

  // Read from CSV
  readFromCSV: (symbol, limit = 50) =>
    api.get(`/api/crawler/data/read/csv/${symbol}`, { params: { limit } }),

  // Get warehouse stats
  getWarehouseStats: () =>
    api.get('/api/crawler/data/warehouse/stats'),
};

export default api;