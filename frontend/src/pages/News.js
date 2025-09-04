import React, { useState, useEffect } from 'react';
import { newsService, crawlerService } from '../services/api';

const News = () => {
  const [news, setNews] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [trendingHeadlines, setTrendingHeadlines] = useState({});
  const [warehouseStats, setWarehouseStats] = useState(null);

  useEffect(() => {
    const fetchEnhancedNews = async () => {
      try {
        setLoading(true);
        console.log('🔗 Using gateway-based crawler service');
        
        // Fetch trending headlines first
        try {
          const trendingData = await crawlerService.getTrending();
          setTrendingHeadlines(trendingData.data.trending_headlines || {});
        } catch (error) {
          console.warn('Could not fetch trending headlines:', error);
        }

        // Fetch latest news from enhanced crawler
        try {
          const newsData = await crawlerService.getEnhancedNews('BTCUSDT', 20);
          console.log('Raw news data:', newsData); // Debug log
          
          // Handle different possible data structures
          let newsArray = [];
          if (newsData.data.news_data && Array.isArray(newsData.data.news_data.articles)) {
            // Handle the actual API response structure
            newsArray = newsData.data.news_data.articles;
          } else if (Array.isArray(newsData.data.news_data)) {
            newsArray = newsData.data.news_data;
          } else if (Array.isArray(newsData.data.data)) {
            newsArray = newsData.data.data;
          } else if (Array.isArray(newsData.data)) {
            newsArray = newsData.data;
          } else {
            console.warn('Unexpected news data structure:', newsData);
            newsArray = [];
          }
          
          // Transform enhanced news data to match existing UI structure
          const transformedNews = newsArray.map((item, index) => {
            console.log(`Article ${index + 1} sentiment:`, item.sentiment, typeof item.sentiment);
            return {
              id: index + 1,
              title: item.title || item.headline || item.name || 'Financial News Update',
              summary: item.description || item.summary || item.content || 'Market analysis and financial insights',
              category: item.category || item.type || 'crypto',
              source: item.source || item.domain || 'Financial Source',
              publishedAt: item.published_at || item.timestamp || item.date || new Date().toISOString(),
              image: item.image || `https://picsum.photos/300/200?random=${index}`,
              url: item.url || item.link || item.source_url || '#',
              sentiment: (item.sentiment && typeof item.sentiment === 'string') ? item.sentiment : 'neutral',
              confidence: (typeof item.confidence === 'number') ? item.confidence : 0.5,
              keywords: Array.isArray(item.keywords) ? item.keywords : (Array.isArray(item.tags) ? item.tags : [])
            };
          });
          
          setNews(transformedNews);
          setError(null);
          
          // Show storage confirmation if available
          if (newsData.data.stored_count !== undefined) {
            console.log(`✅ Stored ${newsData.data.stored_count} articles in data warehouse`);
          }
        } catch (newsError) {
          console.warn('Failed to fetch enhanced news:', newsError);
          setError('Failed to load enhanced news. Please try again later.');
          setNews([]);
        }
      } catch (err) {
        console.error('Error fetching enhanced news:', err);
        setError('Failed to load enhanced news. Please try again later.');
        setNews([]);
      } finally {
        setLoading(false);
      }
    };

    const fetchCategories = async () => {
      try {
        const response = await newsService.getNewsCategories();
        setCategories(response.data || []);
      } catch (err) {
        console.warn('Using enhanced categories:', err);
        setCategories(['all', 'crypto', 'stocks', 'forex', 'commodities', 'economy', 'sentiment']);
      }
    };

    const fetchWarehouseStats = async () => {
      try {
        const stats = await crawlerService.getWarehouseStats();
        setWarehouseStats(stats.data.data);
      } catch (err) {
        console.warn('Could not fetch warehouse stats:', err);
      }
    };

    fetchEnhancedNews();
    fetchCategories();
    fetchWarehouseStats();
  }, []);


  const filteredNews = selectedCategory === 'all' 
    ? news 
    : news.filter(item => item.category === selectedCategory);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getSentimentColor = (sentiment) => {
    const colors = {
      positive: 'text-green-600 bg-green-100',
      negative: 'text-red-600 bg-red-100',
      neutral: 'text-gray-600 bg-gray-100'
    };
    return colors[sentiment] || colors.neutral;
  };

  const getSentimentIcon = (sentiment) => {
    const icons = {
      positive: '📈',
      negative: '📉',
      neutral: '➖'
    };
    return icons[sentiment] || '➖';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Enhanced Financial News</h1>
        <p className="mt-2 text-gray-600">AI-powered sentiment analysis and real-time market insights</p>
        
        {/* Data Warehouse Status */}
        <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="text-green-400 mr-3">🗄️</div>
            <div>
              <p className="text-sm font-medium text-green-800">Data Warehouse Active</p>
              <p className="text-sm text-green-700">
                News articles are being stored with sentiment analysis in SQLite database
                {warehouseStats && (
                  <span className="ml-2 text-green-600">
                    • Database: {warehouseStats.database_path?.split('/').pop() || 'financial_data.db'}
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Trending Headlines Section */}
      {Object.keys(trendingHeadlines).length > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg shadow-sm border border-blue-200 p-6">
          <h2 className="text-lg font-medium text-blue-900 mb-4">🔥 Trending Headlines</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(trendingHeadlines).slice(0, 6).map(([topic, data]) => (
              <div key={topic} className="bg-white rounded-lg p-4 border border-blue-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-blue-800">{topic}</span>
                  <span className="text-xs text-blue-600">{data.count || 0} mentions</span>
                </div>
                <p className="text-sm text-gray-700">{data.description || 'Market trending topic'}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Category Filter */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Categories</h2>
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                selectedCategory === category
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* News Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredNews.map((item) => (
          <article key={item.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
            <div className="aspect-video bg-gray-200">
              <img
                src={item.image}
                alt={item.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.src = 'https://via.placeholder.com/300x200/6b7280/ffffff?text=News';
                }}
              />
            </div>
            
            <div className="p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getSentimentColor(item.sentiment)}`}>
                    {getSentimentIcon(item.sentiment)} {item.sentiment.charAt(0).toUpperCase() + item.sentiment.slice(1)}
                  </span>
                  {item.confidence && (
                    <span className="text-xs text-gray-500">
                      {(item.confidence * 100).toFixed(0)}% confidence
                    </span>
                  )}
                </div>
                <span className="text-xs text-gray-500">{item.source}</span>
              </div>
              
              <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                {item.title}
              </h3>
              
              <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                {item.summary}
              </p>

              {/* Keywords */}
              {item.keywords && item.keywords.length > 0 && (
                <div className="mb-4">
                  <div className="flex flex-wrap gap-1">
                    {item.keywords.slice(0, 3).map((keyword, idx) => (
                      <span key={idx} className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  {formatDate(item.publishedAt)}
                </span>
                
                <a 
                  href={item.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                >
                  Read More →
                </a>
              </div>
            </div>
          </article>
        ))}
      </div>

      {/* Load More Button */}
      {filteredNews.length > 0 && (
        <div className="text-center">
          <button 
            onClick={async () => {
              setLoading(true);
              try {
                const data = await crawlerService.getEnhancedNews('BTCUSDT', 20);
                if (data.data.stored_count !== undefined) {
                  alert(`✅ Refreshed and stored ${data.data.stored_count} new articles in data warehouse!`);
                }
                fetchEnhancedNews(); // Refresh the display
              } catch (error) {
                console.error('Error refreshing news:', error);
              } finally {
                setLoading(false);
              }
            }}
            className="px-6 py-3 bg-primary-600 text-white font-medium rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            Refresh News
          </button>
        </div>
      )}

      {/* No News Message */}
      {filteredNews.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">📰</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No news available</h3>
          <p className="text-gray-500">Try selecting a different category or check back later.</p>
        </div>
      )}

      {error && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex">
            <div className="text-yellow-400">⚠️</div>
            <div className="ml-3">
              <p className="text-sm font-medium text-yellow-800">Warning</p>
              <div className="mt-2 text-sm text-yellow-700">{error}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default News; 