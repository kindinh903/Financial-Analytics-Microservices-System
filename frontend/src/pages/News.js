import React, { useState, useEffect } from 'react';
import { newsService } from '../services/api';

const News = () => {
  const [news, setNews] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        setLoading(true);
        const response = await newsService.getNews();
        setNews(response.data || []);
      } catch (err) {
        console.error('Error fetching news:', err);
        setError('Failed to load news. Using sample data.');
        // Fallback to mock data
        setNews(generateMockNews());
      } finally {
        setLoading(false);
      }
    };

    const fetchCategories = async () => {
      try {
        const response = await newsService.getNewsCategories();
        setCategories(response.data || []);
      } catch (err) {
        console.warn('Using fallback categories:', err);
        setCategories(['all', 'crypto', 'stocks', 'forex', 'commodities', 'economy']);
      }
    };

    fetchNews();
    fetchCategories();
  }, []);

  const generateMockNews = () => [
    {
      id: 1,
      title: 'Bitcoin Surges Past $50,000 as Institutional Adoption Grows',
      summary: 'Bitcoin has reached a new milestone, crossing the $50,000 mark for the first time since December 2021, driven by increased institutional adoption and positive market sentiment.',
      category: 'crypto',
      source: 'CryptoNews',
      publishedAt: '2024-01-15T10:30:00Z',
      image: 'https://via.placeholder.com/300x200/26a69a/ffffff?text=Bitcoin',
      url: '#',
      sentiment: 'positive'
    },
    {
      id: 2,
      title: 'Federal Reserve Signals Potential Rate Cuts in 2024',
      summary: 'The Federal Reserve has indicated a more dovish stance, suggesting potential interest rate cuts in 2024 as inflation continues to moderate.',
      category: 'economy',
      source: 'Financial Times',
      publishedAt: '2024-01-15T09:15:00Z',
      image: 'https://via.placeholder.com/300x200/3b82f6/ffffff?text=Fed',
      url: '#',
      sentiment: 'neutral'
    },
    {
      id: 3,
      title: 'Tech Stocks Rally on Strong Earnings Reports',
      summary: 'Major technology companies have reported strong quarterly earnings, leading to a broad rally in tech stocks and pushing major indices to new highs.',
      category: 'stocks',
      source: 'MarketWatch',
      publishedAt: '2024-01-15T08:45:00Z',
      image: 'https://via.placeholder.com/300x200/10b981/ffffff?text=Tech',
      url: '#',
      sentiment: 'positive'
    },
    {
      id: 4,
      title: 'Oil Prices Stabilize Amid Global Supply Concerns',
      summary: 'Oil prices have stabilized after recent volatility, as traders weigh global supply concerns against demand projections for 2024.',
      category: 'commodities',
      source: 'Reuters',
      publishedAt: '2024-01-15T07:30:00Z',
      image: 'https://via.placeholder.com/300x200/f59e0b/ffffff?text=Oil',
      url: '#',
      sentiment: 'neutral'
    },
    {
      id: 5,
      title: 'Ethereum Network Upgrade Shows Promising Results',
      summary: 'The latest Ethereum network upgrade has demonstrated improved transaction speeds and reduced gas fees, boosting confidence in the platform.',
      category: 'crypto',
      source: 'CoinDesk',
      publishedAt: '2024-01-15T06:20:00Z',
      image: 'https://via.placeholder.com/300x200/8b5cf6/ffffff?text=Ethereum',
      url: '#',
      sentiment: 'positive'
    },
    {
      id: 6,
      title: 'Asian Markets Mixed as Investors Await Fed Decision',
      summary: 'Asian markets showed mixed performance as investors remained cautious ahead of the Federal Reserve\'s upcoming policy decision.',
      category: 'stocks',
      source: 'Bloomberg',
      publishedAt: '2024-01-15T05:10:00Z',
      image: 'https://via.placeholder.com/300x200/ef4444/ffffff?text=Asia',
      url: '#',
      sentiment: 'neutral'
    }
  ];

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
        <h1 className="text-3xl font-bold text-gray-900">Financial News</h1>
        <p className="mt-2 text-gray-600">Stay updated with the latest market news and analysis</p>
      </div>

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
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getSentimentColor(item.sentiment)}`}>
                  {item.sentiment.charAt(0).toUpperCase() + item.sentiment.slice(1)}
                </span>
                <span className="text-xs text-gray-500">{item.source}</span>
              </div>
              
              <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                {item.title}
              </h3>
              
              <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                {item.summary}
              </p>
              
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  {formatDate(item.publishedAt)}
                </span>
                
                <button className="text-primary-600 hover:text-primary-700 text-sm font-medium">
                  Read More →
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>

      {/* Load More Button */}
      {filteredNews.length > 0 && (
        <div className="text-center">
          <button className="px-6 py-3 bg-primary-600 text-white font-medium rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
            Load More News
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