#!/usr/bin/env python3
"""
Simplified Data Warehouse without pandas dependency
"""

import sqlite3
import json
import os
from datetime import datetime
from pathlib import Path
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class SimpleDataWarehouse:
    def __init__(self, data_dir: str = "data_warehouse"):
        """
        Initialize the Simple Data Warehouse
        
        Args:
            data_dir: Directory to store all data files
        """
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(exist_ok=True)
        
        # Create subdirectories
        (self.data_dir / "csv").mkdir(exist_ok=True)
        (self.data_dir / "json").mkdir(exist_ok=True)
        (self.data_dir / "sqlite").mkdir(exist_ok=True)
        
        # Initialize SQLite database
        self.db_path = self.data_dir / "sqlite" / "financial_data.db"
        self.init_database()
        
        logger.info(f"Simple data warehouse initialized at: {self.data_dir}")
    
    def init_database(self):
        """Initialize SQLite database with required tables"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # News articles table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS news_articles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                content TEXT,
                summary TEXT,
                source TEXT,
                url TEXT,
                published_at TIMESTAMP,
                category TEXT,
                symbol TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Sentiment analysis table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS sentiment_analysis (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                article_id INTEGER,
                text TEXT NOT NULL,
                sentiment_label TEXT NOT NULL,
                sentiment_score REAL NOT NULL,
                confidence REAL NOT NULL,
                positive_score REAL,
                negative_score REAL,
                neutral_score REAL,
                compound_score REAL,
                keywords TEXT,
                analysis_method TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (article_id) REFERENCES news_articles (id)
            )
        ''')
        
        conn.commit()
        conn.close()
        logger.info("Database tables initialized successfully")
    
    def store_news_article(self, article_data: dict) -> int:
        """
        Store a news article in the database
        
        Args:
            article_data: Dictionary containing article information
            
        Returns:
            article_id: ID of the stored article
        """
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO news_articles 
            (title, content, summary, source, url, published_at, category, symbol)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            article_data.get('title', ''),
            article_data.get('content', ''),
            article_data.get('summary', ''),
            article_data.get('source', ''),
            article_data.get('url', ''),
            article_data.get('published_at'),
            article_data.get('category', 'crypto'),
            article_data.get('symbol', 'BTCUSDT')
        ))
        
        article_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        logger.info(f"Stored news article with ID: {article_id}")
        return article_id
    
    def store_sentiment_analysis(self, article_id: int, sentiment_data: dict) -> int:
        """
        Store sentiment analysis results
        
        Args:
            article_id: ID of the associated article
            sentiment_data: Dictionary containing sentiment analysis results
            
        Returns:
            sentiment_id: ID of the stored sentiment analysis
        """
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO sentiment_analysis 
            (article_id, text, sentiment_label, sentiment_score, confidence, 
             positive_score, negative_score, neutral_score, compound_score, 
             keywords, analysis_method)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            article_id,
            sentiment_data.get('text', ''),
            sentiment_data.get('sentiment_label', 'neutral'),
            sentiment_data.get('sentiment_score', 0.0),
            sentiment_data.get('confidence', 0.0),
            sentiment_data.get('positive_score', 0.0),
            sentiment_data.get('negative_score', 0.0),
            sentiment_data.get('neutral_score', 0.0),
            sentiment_data.get('compound_score', 0.0),
            json.dumps(sentiment_data.get('keywords', [])),
            sentiment_data.get('analysis_method', 'simple')
        ))
        
        sentiment_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        logger.info(f"Stored sentiment analysis with ID: {sentiment_id}")
        return sentiment_id
    
    def get_sentiment_summary(self, symbol: str = 'BTCUSDT', days: int = 7) -> dict:
        """
        Get sentiment analysis summary
        
        Args:
            symbol: Trading symbol
            days: Number of days to analyze
            
        Returns:
            Dictionary with sentiment summary
        """
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        query = '''
            SELECT 
                COUNT(*) as total_articles,
                AVG(sa.sentiment_score) as avg_sentiment,
                AVG(sa.confidence) as avg_confidence,
                SUM(CASE WHEN sa.sentiment_label = 'positive' THEN 1 ELSE 0 END) as positive_count,
                SUM(CASE WHEN sa.sentiment_label = 'negative' THEN 1 ELSE 0 END) as negative_count,
                SUM(CASE WHEN sa.sentiment_label = 'neutral' THEN 1 ELSE 0 END) as neutral_count
            FROM sentiment_analysis sa
            JOIN news_articles na ON sa.article_id = na.id
            WHERE na.symbol = ? 
            AND sa.created_at >= datetime('now', '-{} days')
        '''.format(days)
        
        cursor.execute(query, (symbol,))
        result = cursor.fetchone()
        conn.close()
        
        if result and result[0] > 0:
            total, avg_sentiment, avg_confidence, pos, neg, neu = result
            
            # Calculate percentages
            total_float = float(total)
            positive_pct = (pos / total_float) * 100
            negative_pct = (neg / total_float) * 100
            neutral_pct = (neu / total_float) * 100
            
            # Determine overall sentiment
            if positive_pct > negative_pct and positive_pct > neutral_pct:
                overall_sentiment = 'positive'
            elif negative_pct > positive_pct and negative_pct > neutral_pct:
                overall_sentiment = 'negative'
            else:
                overall_sentiment = 'neutral'
            
            return {
                'symbol': symbol,
                'period_days': days,
                'total_articles': total,
                'overall_sentiment': overall_sentiment,
                'average_sentiment_score': round(avg_sentiment, 3) if avg_sentiment else 0.0,
                'average_confidence': round(avg_confidence, 3) if avg_confidence else 0.0,
                'positive_articles': pos,
                'negative_articles': neg,
                'neutral_articles': neu,
                'positive_percentage': round(positive_pct, 1),
                'negative_percentage': round(negative_pct, 1),
                'neutral_percentage': round(neutral_pct, 1),
                'analyzed_at': datetime.now().isoformat()
            }
        
        return {
            'symbol': symbol,
            'period_days': days,
            'total_articles': 0,
            'overall_sentiment': 'neutral',
            'message': 'No data available for the specified period'
        }
    
    def get_all_articles(self, symbol: str = 'BTCUSDT', limit: int = 10) -> list:
        """
        Get all articles for a symbol
        
        Args:
            symbol: Trading symbol
            limit: Maximum number of articles to return
            
        Returns:
            List of articles with sentiment data
        """
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        query = '''
            SELECT 
                na.id,
                na.title,
                na.source,
                na.url,
                na.published_at,
                sa.sentiment_label,
                sa.sentiment_score,
                sa.confidence,
                sa.keywords,
                sa.created_at as analyzed_at
            FROM news_articles na
            LEFT JOIN sentiment_analysis sa ON na.id = sa.article_id
            WHERE na.symbol = ?
            ORDER BY na.created_at DESC
            LIMIT ?
        '''
        
        cursor.execute(query, (symbol, limit))
        results = cursor.fetchall()
        conn.close()
        
        articles = []
        for row in results:
            articles.append({
                'id': row[0],
                'title': row[1],
                'source': row[2],
                'url': row[3],
                'published_at': row[4],
                'sentiment_label': row[5] or 'neutral',
                'sentiment_score': row[6] or 0.0,
                'confidence': row[7] or 0.0,
                'keywords': json.loads(row[8]) if row[8] else [],
                'analyzed_at': row[9]
            })
        
        return articles
    
    def export_to_csv(self, symbol: str = 'BTCUSDT') -> str:
        """
        Export data to CSV format with deduplication
        
        Args:
            symbol: Trading symbol
            
        Returns:
            Path to the exported CSV file
        """
        articles = self.get_all_articles(symbol, 1000)  # Get more articles
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"sentiment_analysis_{symbol}_{timestamp}.csv"
        csv_path = self.data_dir / "csv" / filename
        
        # Check if CSV file already exists and read existing URLs
        existing_urls = set()
        if csv_path.exists():
            try:
                with open(csv_path, 'r', encoding='utf-8') as f:
                    lines = f.readlines()
                    for line in lines[1:]:  # Skip header
                        parts = line.strip().split(',')
                        if len(parts) >= 4:
                            existing_urls.add(parts[3])  # URL is in 4th column
            except Exception as e:
                logger.warning(f"Could not read existing CSV file: {e}")
        
        # Create CSV content
        csv_content = "ID,Title,Source,URL,Published At,Sentiment,Score,Confidence,Keywords,Analyzed At\n"
        
        # Only add articles that don't already exist in CSV
        new_articles_count = 0
        for article in articles:
            if article['url'] not in existing_urls:
                keywords_str = ', '.join(article['keywords']) if isinstance(article['keywords'], list) else str(article['keywords'])
                csv_content += f"{article['id']},{article['title']},{article['source']},{article['url']},{article['published_at']},{article['sentiment_label']},{article['sentiment_score']},{article['confidence']},\"{keywords_str}\",{article['analyzed_at']}\n"
                existing_urls.add(article['url'])  # Add to set to avoid duplicates in same export
                new_articles_count += 1
        
        # Write to file
        with open(csv_path, 'w', encoding='utf-8') as f:
            f.write(csv_content)
        
        logger.info(f"Exported {new_articles_count} new articles to {csv_path}")
        return str(csv_path)
    
    def article_exists_by_url(self, url):
        """Check if an article with the given URL already exists"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute("SELECT COUNT(*) FROM news_articles WHERE url = ?", (url,))
            count = cursor.fetchone()[0]
            
            conn.close()
            return count > 0
            
        except Exception as e:
            logger.error(f"Error checking article existence: {str(e)}")
            return False
    
    def get_recent_articles(self, limit=50):
        """Get recent articles from the database"""
        try:
            logger.info(f"Getting recent articles from database: {self.db_path}")
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # First, let's check what tables exist
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
            tables = cursor.fetchall()
            logger.info(f"Available tables: {[table[0] for table in tables]}")
            
            # Check if articles table has any data
            cursor.execute("SELECT COUNT(*) FROM news_articles")
            article_count = cursor.fetchone()[0]
            logger.info(f"Total articles in database: {article_count}")
            
            # Get recent articles with sentiment analysis
            query = """
            SELECT a.id, a.title, a.source, a.url, a.published_at, 
                   s.sentiment_label, s.sentiment_score, s.confidence, s.keywords, s.created_at
            FROM news_articles a
            LEFT JOIN sentiment_analysis s ON a.id = s.article_id
            ORDER BY a.published_at DESC
            LIMIT ?
            """
            
            cursor.execute(query, (limit,))
            rows = cursor.fetchall()
            logger.info(f"Query returned {len(rows)} rows")
            
            articles = []
            for row in rows:
                article = {
                    'id': row[0],
                    'title': row[1],
                    'source': row[2],
                    'url': row[3],
                    'published_at': row[4],
                    'sentiment': row[5] if row[5] else 'neutral',
                    'score': row[6] if row[6] else 0.0,
                    'confidence': row[7] if row[7] else 0.5,
                    'keywords': row[8] if row[8] else '',
                    'analyzed_at': row[9] if row[9] else None
                }
                articles.append(article)
            
            conn.close()
            logger.info(f"Returning {len(articles)} articles")
            return articles
            
        except Exception as e:
            logger.error(f"Error getting recent articles: {str(e)}")
            return []

# Example usage and testing
if __name__ == "__main__":
    # Initialize data warehouse
    warehouse = SimpleDataWarehouse()
    
    print("✅ Simple Data Warehouse initialized successfully!")
    print(f"📁 Database location: {warehouse.db_path}")
    
    # Example: Store a news article
    sample_article = {
        'title': 'Bitcoin Reaches New All-Time High',
        'content': 'Bitcoin has reached a new all-time high of $100,000...',
        'summary': 'Bitcoin hits $100K milestone',
        'source': 'CoinDesk',
        'url': 'https://coindesk.com/bitcoin-100k',
        'published_at': datetime.now().isoformat(),
        'category': 'crypto',
        'symbol': 'BTCUSDT'
    }
    
    article_id = warehouse.store_news_article(sample_article)
    print(f"📰 Stored article with ID: {article_id}")
    
    # Example: Store sentiment analysis
    sample_sentiment = {
        'text': 'Bitcoin has reached a new all-time high of $100,000',
        'sentiment_label': 'positive',
        'sentiment_score': 0.8,
        'confidence': 0.9,
        'positive_score': 0.8,
        'negative_score': 0.1,
        'neutral_score': 0.1,
        'compound_score': 0.7,
        'keywords': ['bitcoin', 'high', 'milestone'],
        'analysis_method': 'simple'
    }
    
    sentiment_id = warehouse.store_sentiment_analysis(article_id, sample_sentiment)
    print(f"🧠 Stored sentiment analysis with ID: {sentiment_id}")
    
    # Get sentiment summary
    summary = warehouse.get_sentiment_summary('BTCUSDT', 1)
    print(f"\n📊 Sentiment Summary:")
    print(f"   Total Articles: {summary['total_articles']}")
    print(f"   Overall Sentiment: {summary['overall_sentiment']}")
    print(f"   Average Score: {summary['average_sentiment_score']}")
    
    # Get all articles
    articles = warehouse.get_all_articles('BTCUSDT', 5)
    print(f"\n📰 Recent Articles:")
    for article in articles:
        print(f"   - {article['title'][:40]}... → {article['sentiment_label']} ({article['confidence']:.2f})")
    
    # Export to CSV
    csv_path = warehouse.export_to_csv('BTCUSDT')
    print(f"\n📁 Exported to: {csv_path}")
    
    print(f"\n🎉 Simple Data Warehouse Demo Complete!")
