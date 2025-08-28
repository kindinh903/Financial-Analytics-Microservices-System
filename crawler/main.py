import requests
from bs4 import BeautifulSoup
import re
import json
import os
from datetime import datetime, timedelta
import nltk
from nltk.corpus import stopwords
from nltk.tokenize import word_tokenize
import logging
import time
from dotenv import load_dotenv
import pandas as pd
import websocket
import threading
from binance.client import Client
from binance.exceptions import BinanceAPIException
import ccxt
from textblob import TextBlob
import vaderSentiment.vaderSentiment as vader

# Load environment variables
load_dotenv()

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("crawler.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Download NLTK resources
nltk.download('punkt', quiet=True)
nltk.download('stopwords', quiet=True)

class FinancialDataCrawler:
    def __init__(self):
        self.stop_words = set(stopwords.words('english'))
        self.data_dir = os.path.join(os.getcwd(), 'data')
        os.makedirs(self.data_dir, exist_ok=True)
        
        # API keys
        self.binance_api_key = os.getenv('BINANCE_API_KEY')
        self.binance_secret_key = os.getenv('BINANCE_SECRET_KEY')
        self.news_api_key = os.getenv('NEWS_API_KEY')
        
        # Initialize Binance client
        try:
            self.binance_client = Client(self.binance_api_key, self.binance_secret_key)
            logger.info("Binance client initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize Binance client: {str(e)}")
            self.binance_client = None
        
        # Initialize sentiment analyzer
        self.sentiment_analyzer = vader.SentimentAnalyzer()
        
        # Financial news sources
        self.news_sources = [
            'coindesk.com',
            'cointelegraph.com', 
            'bitcoin.com',
            'cryptonews.com',
            'investing.com',
            'marketwatch.com',
            'bloomberg.com',
            'reuters.com',
            'cnbc.com'
        ]
        
    def get_binance_price(self, symbol):
        """Get real-time price from Binance"""
        try:
            if not self.binance_client:
                return None
                
            ticker = self.binance_client.get_symbol_ticker(symbol=symbol)
            return {
                'symbol': symbol,
                'price': float(ticker['price']),
                'timestamp': datetime.now().isoformat(),
                'source': 'binance'
            }
        except BinanceAPIException as e:
            logger.error(f"Binance API error: {str(e)}")
            return None
        except Exception as e:
            logger.error(f"Error getting Binance price: {str(e)}")
            return None
    
    def get_binance_klines(self, symbol, interval='1h', limit=1000):
        """Get historical kline data from Binance"""
        try:
            if not self.binance_client:
                return None
                
            klines = self.binance_client.get_klines(
                symbol=symbol,
                interval=interval,
                limit=limit
            )
            
            # Convert to structured format
            data = []
            for kline in klines:
                data.append({
                    'timestamp': datetime.fromtimestamp(kline[0] / 1000).isoformat(),
                    'open': float(kline[1]),
                    'high': float(kline[2]),
                    'low': float(kline[3]),
                    'close': float(kline[4]),
                    'volume': float(kline[5]),
                    'close_time': datetime.fromtimestamp(kline[6] / 1000).isoformat(),
                    'quote_volume': float(kline[7]),
                    'trades': int(kline[8]),
                    'taker_buy_base': float(kline[9]),
                    'taker_buy_quote': float(kline[10])
                })
            
            return {
                'symbol': symbol,
                'interval': interval,
                'data': data,
                'source': 'binance'
            }
        except Exception as e:
            logger.error(f"Error getting Binance klines: {str(e)}")
            return None
    
    def get_market_overview(self):
        """Get overview of top cryptocurrencies"""
        try:
            if not self.binance_client:
                return None
                
            # Get 24hr ticker for all symbols
            tickers = self.binance_client.get_ticker()
            
            # Filter for USDT pairs and sort by volume
            usdt_pairs = [t for t in tickers if t['symbol'].endswith('USDT')]
            usdt_pairs.sort(key=lambda x: float(x['volume']), reverse=True)
            
            # Get top 20 by volume
            top_pairs = usdt_pairs[:20]
            
            market_data = []
            for pair in top_pairs:
                market_data.append({
                    'symbol': pair['symbol'],
                    'price': float(pair['lastPrice']),
                    'price_change': float(pair['priceChange']),
                    'price_change_percent': float(pair['priceChangePercent']),
                    'volume': float(pair['volume']),
                    'quote_volume': float(pair['quoteVolume']),
                    'high_24h': float(pair['highPrice']),
                    'low_24h': float(pair['lowPrice'])
                })
            
            return {
                'timestamp': datetime.now().isoformat(),
                'market_data': market_data,
                'source': 'binance'
            }
        except Exception as e:
            logger.error(f"Error getting market overview: {str(e)}")
            return None
    
    def crawl_financial_news(self, keywords):
        """Crawl financial news from various sources"""
        try:
            # Use NewsAPI if available
            if self.news_api_key:
                return self.get_news_api_news(keywords)
            else:
                return self.get_manual_news(keywords)
        except Exception as e:
            logger.error(f"Error crawling financial news: {str(e)}")
            return {'source': 'news', 'articles': [], 'error': str(e)}
    
    def get_news_api_news(self, keywords):
        """Get news from NewsAPI"""
        try:
            query = ' OR '.join(keywords[:3])  # Limit to 3 keywords
            url = "https://newsapi.org/v2/everything"
            params = {
                'q': query,
                'apiKey': self.news_api_key,
                'language': 'en',
                'sortBy': 'publishedAt',
                'pageSize': 20,
                'domains': ','.join(self.news_sources)
            }
            
            response = requests.get(url, params=params)
            data = response.json()
            
            if data.get('status') == 'ok':
                articles = []
                for article in data.get('articles', []):
                    articles.append({
                        'title': article.get('title', ''),
                        'description': article.get('description', ''),
                        'content': article.get('content', ''),
                        'url': article.get('url', ''),
                        'source': article.get('source', {}).get('name', ''),
                        'published_at': article.get('publishedAt', ''),
                        'sentiment': self.analyze_sentiment(article.get('title', '') + ' ' + article.get('description', ''))
                    })
                
                return {
                    'source': 'newsapi',
                    'articles': articles,
                    'total_results': data.get('totalResults', 0)
                }
            else:
                return {
                    'source': 'newsapi',
                    'articles': [],
                    'error': data.get('message', 'Unknown error')
                }
                
        except Exception as e:
            logger.error(f"NewsAPI error: {str(e)}")
            return {
                'source': 'newsapi',
                'articles': [],
                'error': str(e)
            }
    
    def get_manual_news(self, keywords):
        """Manual news crawling as fallback"""
        try:
            # This would be a more sophisticated web scraper
            # For now, return sample financial news
            sample_news = [
                {
                    'title': 'Bitcoin Surges Past $50,000 as Institutional Adoption Grows',
                    'description': 'Bitcoin has reached a new milestone, crossing the $50,000 mark for the first time since December 2021.',
                    'content': 'Bitcoin has reached a new milestone, crossing the $50,000 mark for the first time since December 2021, driven by increased institutional adoption and positive market sentiment.',
                    'url': 'https://example.com/bitcoin-surge',
                    'source': 'Financial News',
                    'published_at': datetime.now().isoformat(),
                    'sentiment': self.analyze_sentiment('Bitcoin Surges Past $50,000 as Institutional Adoption Grows')
                },
                {
                    'title': 'Ethereum Network Upgrade Shows Promising Results',
                    'description': 'The latest Ethereum network upgrade has demonstrated improved transaction speeds and reduced gas fees.',
                    'content': 'The latest Ethereum network upgrade has demonstrated improved transaction speeds and reduced gas fees, boosting confidence in the platform.',
                    'url': 'https://example.com/ethereum-upgrade',
                    'source': 'Crypto News',
                    'published_at': datetime.now().isoformat(),
                    'sentiment': self.analyze_sentiment('Ethereum Network Upgrade Shows Promising Results')
                }
            ]
            
            return {
                'source': 'manual',
                'articles': sample_news,
                'total_results': len(sample_news)
            }
            
        except Exception as e:
            logger.error(f"Manual news error: {str(e)}")
            return {
                'source': 'manual',
                'articles': [],
                'error': str(e)
            }
    
    def analyze_sentiment(self, text):
        """Analyze sentiment of financial text"""
        try:
            if not text:
                return {'sentiment': 'neutral', 'confidence': 0.0}
            
            # VADER for financial text (better for social media/news)
            vader_scores = self.sentiment_analyzer.polarity_scores(text)
            
            # TextBlob for general sentiment
            blob = TextBlob(text)
            textblob_sentiment = blob.sentiment.polarity
            
            # Determine overall sentiment
            compound_score = vader_scores['compound']
            if compound_score >= 0.05:
                overall_sentiment = 'positive'
            elif compound_score <= -0.05:
                overall_sentiment = 'negative'
            else:
                overall_sentiment = 'neutral'
            
            return {
                'sentiment': overall_sentiment,
                'confidence': abs(compound_score),
                'vader_scores': vader_scores,
                'textblob_sentiment': textblob_sentiment,
                'compound_score': compound_score
            }
            
        except Exception as e:
            logger.error(f"Sentiment analysis error: {str(e)}")
            return {'sentiment': 'neutral', 'confidence': 0.0, 'error': str(e)}
    
    def get_financial_indicators(self, symbol):
        """Get technical indicators for a symbol"""
        try:
            # Get recent klines for calculations
            klines_data = self.get_binance_klines(symbol, '1h', 100)
            if not klines_data or not klines_data['data']:
                return None
            
            data = klines_data['data']
            closes = [float(d['close']) for d in data]
            
            # Simple Moving Averages
            sma_20 = sum(closes[-20:]) / 20 if len(closes) >= 20 else None
            sma_50 = sum(closes[-50:]) / 50 if len(closes) >= 50 else None
            
            # RSI calculation
            rsi = self.calculate_rsi(closes, 14)
            
            # MACD calculation
            macd, signal = self.calculate_macd(closes)
            
            return {
                'symbol': symbol,
                'timestamp': datetime.now().isoformat(),
                'indicators': {
                    'sma_20': sma_20,
                    'sma_50': sma_50,
                    'rsi': rsi,
                    'macd': macd,
                    'macd_signal': signal,
                    'current_price': closes[-1] if closes else None
                },
                'source': 'calculated'
            }
            
        except Exception as e:
            logger.error(f"Error calculating indicators: {str(e)}")
            return None
    
    def calculate_rsi(self, prices, period=14):
        """Calculate RSI indicator"""
        try:
            if len(prices) < period + 1:
                return None
            
            deltas = [prices[i] - prices[i-1] for i in range(1, len(prices))]
            gains = [d if d > 0 else 0 for d in deltas]
            losses = [-d if d < 0 else 0 for d in deltas]
            
            avg_gain = sum(gains[-period:]) / period
            avg_loss = sum(losses[-period:]) / period
            
            if avg_loss == 0:
                return 100
            
            rs = avg_gain / avg_loss
            rsi = 100 - (100 / (1 + rs))
            
            return round(rsi, 2)
            
        except Exception as e:
            logger.error(f"RSI calculation error: {str(e)}")
            return None
    
    def calculate_macd(self, prices, fast=12, slow=26, signal=9):
        """Calculate MACD indicator"""
        try:
            if len(prices) < slow:
                return None, None
            
            # Calculate EMAs
            ema_fast = self.calculate_ema(prices, fast)
            ema_slow = self.calculate_ema(prices, slow)
            
            if not ema_fast or not ema_slow:
                return None, None
            
            # MACD line
            macd_line = ema_fast - ema_slow
            
            # Signal line (EMA of MACD)
            macd_values = [macd_line]
            signal_line = self.calculate_ema(macd_values, signal)
            
            return round(macd_line, 6), round(signal_line, 6) if signal_line else None
            
        except Exception as e:
            logger.error(f"MACD calculation error: {str(e)}")
            return None, None
    
    def calculate_ema(self, prices, period):
        """Calculate Exponential Moving Average"""
        try:
            if len(prices) < period:
                return None
            
            multiplier = 2 / (period + 1)
            ema = prices[0]
            
            for price in prices[1:]:
                ema = (price * multiplier) + (ema * (1 - multiplier))
            
            return ema
            
        except Exception as e:
            logger.error(f"EMA calculation error: {str(e)}")
            return None
    
    def export_to_excel(self, data, filename=None):
        """Export financial data to Excel"""
        if not filename:
            timestamp = int(time.time())
            filename = f"financial_data_{timestamp}.xlsx"
        
        file_path = os.path.join(self.data_dir, filename)
        
        # Prepare data frames
        dfs = []
        
        # Price data
        if 'price_data' in data:
            df_price = pd.DataFrame(data['price_data'])
            dfs.append(df_price)
        
        # Market overview
        if 'market_overview' in data:
            df_market = pd.DataFrame(data['market_overview']['market_data'])
            dfs.append(df_market)
        
        # News data
        if 'news_data' in data:
            news_records = []
            for article in data['news_data'].get('articles', []):
                news_records.append({
                    'title': article.get('title', ''),
                    'description': article.get('description', ''),
                    'source': article.get('source', ''),
                    'sentiment': article.get('sentiment', {}).get('sentiment', ''),
                    'confidence': article.get('sentiment', {}).get('confidence', 0),
                    'published_at': article.get('published_at', '')
                })
            if news_records:
                df_news = pd.DataFrame(news_records)
                dfs.append(df_news)
        
        # Technical indicators
        if 'indicators' in data:
            df_indicators = pd.DataFrame([data['indicators']])
            dfs.append(df_indicators)
        
        # Combine all dataframes
        if dfs:
            df_combined = pd.concat(dfs, ignore_index=True)
            df_combined.to_excel(file_path, index=False, engine='openpyxl')
            logger.info(f"Financial data exported to Excel: {file_path}")
            return file_path
        else:
            logger.warning("No financial data to export to Excel")
            return None
    
    def crawl_financial_data(self, symbol, include_news=True, include_indicators=True):
        """Main function to crawl comprehensive financial data"""
        try:
            start_time = time.time()
            logger.info(f"Starting financial data crawl for symbol: {symbol}")
            
            # Get real-time price
            price_data = self.get_binance_price(symbol)
            
            # Get historical klines
            klines_data = self.get_binance_klines(symbol, '1h', 1000)
            
            # Get market overview
            market_overview = self.get_market_overview()
            
            # Get news if requested
            news_data = None
            if include_news:
                keywords = [symbol.replace('USDT', ''), 'cryptocurrency', 'trading']
                news_data = self.crawl_financial_news(keywords)
            
            # Get technical indicators if requested
            indicators = None
            if include_indicators:
                indicators = self.get_financial_indicators(symbol)
            
            # Prepare final data structure
            final_data = {
                'symbol': symbol,
                'timestamp': datetime.now().isoformat(),
                'price_data': price_data,
                'klines_data': klines_data,
                'market_overview': market_overview,
                'news_data': news_data,
                'indicators': indicators
            }
            
            # Save data to file
            file_path = os.path.join(self.data_dir, f"{symbol.lower()}_{int(time.time())}.json")
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(final_data, f, ensure_ascii=False, indent=4)
            
            # Export to Excel for analysis
            excel_path = self.export_to_excel(final_data, f"{symbol.lower()}_{int(time.time())}.xlsx")
            
            logger.info(f"Financial data crawl completed in {time.time() - start_time:.2f} seconds")
            logger.info(f"Data saved to {file_path}")
            
            return {
                'status': 'success',
                'file_path': file_path,
                'excel_path': excel_path,
                'data': final_data
            }
            
        except Exception as e:
            logger.error(f"Financial data crawl error: {str(e)}")
            return {
                'status': 'error',
                'error': str(e)
            }

# API function to handle crawling requests
def crawl_financial_data(symbol, include_news=True, include_indicators=True):
    """API function to handle financial data crawling requests"""
    crawler = FinancialDataCrawler()
    return crawler.crawl_financial_data(symbol, include_news, include_indicators)

# Example usage
def main():
    # Test with Bitcoin
    result = crawl_financial_data("BTCUSDT", include_news=True, include_indicators=True)
    print(f"Crawl status: {result['status']}")
    
    if result['status'] == 'success':
        print(f"Data saved to: {result['file_path']}")
        if 'excel_path' in result and result['excel_path']:
            print(f"Excel data saved to: {result['excel_path']}")
        
        data = result.get('data', {})
        if 'price_data' in data:
            print(f"Current {data['price_data']['symbol']} price: ${data['price_data']['price']}")
        if 'indicators' in data:
            print(f"RSI: {data['indicators']['indicators']['rsi']}")
    else:
        print(f"Crawl failed: {result.get('error', 'Unknown error')}")

if __name__ == "__main__":
    main()