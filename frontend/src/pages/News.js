import React, { useState, useEffect } from 'react';
import { newsService, crawlerService } from '../services/api';

const News = () => {
  const [news, setNews] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  const retryFetch = () => {
    setRetryCount(prev => prev + 1);
    setError(null);
    setLoading(true);
  };

  const fetchNews = async () => {
    try {
      setLoading(true);
      console.log('🔗 Using gateway-based crawler service');
      
      let newsArray = [];
      let dataSource = 'unknown';

      // First, try to read from CSV files (old news)
      try {
        console.log('📁 Attempting to read from CSV files...');
        const csvData = await crawlerService.readFromCSV('BTCUSDT', 50);
        if (csvData.data && csvData.data.articles && csvData.data.articles.length > 0) {
          newsArray = csvData.data.articles;
          dataSource = 'csv';
          console.log(`✅ Successfully read ${newsArray.length} articles from CSV`);
        }
      } catch (csvError) {
        console.warn('Could not read from CSV files:', csvError);
      }

      // If CSV reading failed or returned no data, try database
      if (newsArray.length === 0) {
        try {
          console.log('🗄️ Attempting to read from database...');
          const newsData = await crawlerService.getStoredNews('BTCUSDT', 50);
          console.log('Raw news data:', newsData); // Debug log
          console.log('News data structure:', {
            hasData: !!newsData.data,
            hasNewsData: !!newsData.data?.news_data,
            hasArticles: !!newsData.data?.news_data?.articles,
            articlesLength: newsData.data?.news_data?.articles?.length || 0
          });
          
          // Handle different possible data structures
          if (newsData.data.news_data && Array.isArray(newsData.data.news_data.articles)) {
            // Handle the actual API response structure
            newsArray = newsData.data.news_data.articles;
            dataSource = 'database';
            console.log('✅ Using news_data.articles structure, found', newsArray.length, 'articles');
          } else if (Array.isArray(newsData.data.news_data)) {
            newsArray = newsData.data.news_data;
            dataSource = 'database';
            console.log('✅ Using news_data array structure, found', newsArray.length, 'articles');
          } else if (Array.isArray(newsData.data.data)) {
            newsArray = newsData.data.data;
            dataSource = 'database';
            console.log('✅ Using data array structure, found', newsArray.length, 'articles');
          } else if (Array.isArray(newsData.data)) {
            newsArray = newsData.data;
            dataSource = 'database';
            console.log('✅ Using root data array structure, found', newsArray.length, 'articles');
          } else {
            console.warn('❌ Unexpected news data structure:', newsData);
            newsArray = [];
          }
        } catch (dbError) {
          console.warn('Could not read from database:', dbError);
        }
      }
      
      // Transform news data to match existing UI structure
      const transformedNews = newsArray.map((item, index) => {
        console.log(`Article ${index + 1} raw data:`, {
          title: item.title,
          sentiment: item.sentiment,
          sentimentType: typeof item.sentiment,
          publishedAt: item.published_at,
          confidence: item.confidence
        });
        
        // Smart category detection based on title and content
        const articleTitle = (item.title || item.headline || item.name || '').toLowerCase();
        const content = (item.description || item.summary || item.content || '').toLowerCase();
        const text = `${articleTitle} ${content}`;
        
        let category = 'cryptocurrency'; // default
        
        if (text.includes('bitcoin') || text.includes('btc')) {
          category = 'bitcoin';
        } else if (text.includes('ethereum') || text.includes('eth')) {
          category = 'ethereum';
        } else if (text.includes('defi') || text.includes('decentralized finance')) {
          category = 'defi';
        } else if (text.includes('nft') || text.includes('non-fungible')) {
          category = 'nft';
        } else if (text.includes('blockchain')) {
          category = 'blockchain';
        } else if (text.includes('trading') || text.includes('exchange')) {
          category = 'trading';
        } else if (text.includes('regulation') || text.includes('regulatory')) {
          category = 'regulation';
        } else if (text.includes('technology') || text.includes('tech')) {
          category = 'technology';
        } else if (text.includes('market') || text.includes('analysis')) {
          category = 'market-analysis';
        }
        
        // Clean and validate the data
        const title = item.title || item.headline || item.name || 'Financial News Update';
        const summary = item.description || item.summary || item.content || title; // Use title as fallback
        const source = item.source || item.domain || 'Financial Source';
        const publishedAt = item.published_at || item.timestamp || item.date || new Date().toISOString();
        const url = item.url || item.link || item.source_url || '#';
        
        // Validate sentiment field
        let sentiment = 'neutral';
        if (item.sentiment && typeof item.sentiment === 'string') {
          // Check if sentiment is a valid value
          if (['positive', 'negative', 'neutral'].includes(item.sentiment.toLowerCase())) {
            sentiment = item.sentiment.toLowerCase();
          } else {
            // If sentiment is not valid (like a timestamp), determine from score
            const score = parseFloat(item.score) || 0;
            if (score > 0.1) {
              sentiment = 'positive';
            } else if (score < -0.1) {
              sentiment = 'negative';
            } else {
              sentiment = 'neutral';
            }
            console.warn(`Invalid sentiment "${item.sentiment}" for article "${title}", using score-based sentiment: ${sentiment}`);
          }
        }
        
        const confidence = (typeof item.confidence === 'number' && item.confidence > 0) ? item.confidence : 0.5;
        
        return {
          id: index + 1,
          title: title,
          summary: summary,
          category: category,
          source: source,
          publishedAt: publishedAt,
          image: item.image || `https://picsum.photos/300/200?random=${index}`,
          url: url,
          sentiment: sentiment,
          confidence: confidence,
          keywords: Array.isArray(item.keywords) ? item.keywords : (Array.isArray(item.tags) ? item.tags : [])
        };
      });
      
      // Filter out obviously bad data
      const validNews = transformedNews.filter(article => {
        // Filter out articles with unrealistic titles
        const title = article.title.toLowerCase();
        const url = article.url.toLowerCase();
        
        const badPatterns = [
          'bitcoin reaches new all-time high of $100',
          'bitcoin reaches new all-time high of $100,000',
          'bitcoin surges past $50',
          'test article',
          'placeholder',
          'sample data',
          'example.com',
          'mock data',
          'fake news'
        ];
        
        const hasBadPattern = badPatterns.some(pattern => 
          title.includes(pattern) || url.includes(pattern)
        );
        
        // Additional validation
        const hasValidUrl = article.url && !article.url.includes('example.com');
        const hasValidTitle = article.title.length > 10;
        const hasValidDate = article.publishedAt && !article.publishedAt.includes('example.com');
        
        return !hasBadPattern && hasValidTitle && hasValidUrl && hasValidDate;
      });
      
      setNews(validNews);
      setError(null);
      
      // Log data source information
      console.log(`📰 Loaded ${validNews.length} articles from ${dataSource} (${newsArray.length} total, ${transformedNews.length - validNews.length} filtered out)`);
      
      // Debug: Show category distribution
      const categoryCount = transformedNews.reduce((acc, item) => {
        acc[item.category] = (acc[item.category] || 0) + 1;
        return acc;
      }, {});
      console.log('📊 Category distribution:', categoryCount);
      
      // Data source confirmation
      console.log(`✅ Successfully loaded news from ${dataSource}`);
    } catch (err) {
      console.error('Error fetching news:', err);
      
      // Handle different types of errors
      if (err.code === 'ECONNABORTED') {
        setError('Request timed out. The crawler is processing data, please wait and try again.');
      } else if (err.response?.status === 404) {
        setError('Crawler service not available. Please check if the service is running.');
      } else {
        setError('Failed to load news. Please try again later.');
      }
      setNews([]);
    } finally {
      setLoading(false);
    }
  };

    const fetchCategories = async () => {
      try {
        const response = await newsService.getNewsCategories();
        console.log('Categories response:', response.data);
        
        // Handle different response structures
        let categoriesArray = [];
        if (Array.isArray(response.data)) {
          categoriesArray = response.data;
        } else if (response.data && Array.isArray(response.data.categories)) {
          categoriesArray = response.data.categories;
        } else {
          console.warn('Unexpected categories structure:', response.data);
          categoriesArray = ['all', 'crypto', 'stocks', 'forex', 'commodities', 'economy', 'sentiment'];
        }
        
        setCategories(categoriesArray);
      } catch (err) {
        console.warn('Using fallback categories:', err);
        setCategories(['all', 'crypto', 'stocks', 'forex', 'commodities', 'economy', 'sentiment']);
      }
    };


  useEffect(() => {
    fetchNews();
    fetchCategories();
  }, [retryCount]);


  const filteredNews = selectedCategory === 'all' 
    ? news 
    : news.filter(item => {
        // Case-insensitive category matching
        const matches = item.category && item.category.toLowerCase() === selectedCategory.toLowerCase();
        if (selectedCategory !== 'all') {
          console.log(`Filtering: "${item.category}" vs "${selectedCategory}" = ${matches}`);
        }
        return matches;
      });

  const formatDate = (dateString) => {
    try {
      if (!dateString) return 'No date';
      
      // Handle different date formats
      let date;
      if (dateString.includes('T') && dateString.includes('Z')) {
        // ISO format: 2025-09-02T08:25:59Z
        date = new Date(dateString);
      } else if (dateString.includes(' ')) {
        // Format: 2025-09-03 09:43:58
        date = new Date(dateString.replace(' ', 'T'));
      } else {
        date = new Date(dateString);
      }
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return 'Invalid date';
      }
      
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.warn('Date formatting error:', error, 'for date:', dateString);
      return 'Invalid date';
    }
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
        <h1 className="text-3xl font-bold text-gray-900">Financial News</h1>
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
                fetchNews(); // Refresh the display
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
            <div className="ml-3 flex-1">
              <p className="text-sm font-medium text-yellow-800">Warning</p>
              <div className="mt-2 text-sm text-yellow-700">{error}</div>
              <button
                onClick={retryFetch}
                className="mt-3 px-4 py-2 bg-yellow-600 text-white text-sm font-medium rounded-md hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2"
              >
                Retry ({retryCount > 0 ? `Attempt ${retryCount + 1}` : 'Try Again'})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default News; 