#!/usr/bin/env python3
"""
Simple Sentiment Analyzer for the Data Warehouse
"""

import re
import json
import logging
from datetime import datetime
from typing import Dict, List, Any
from textblob import TextBlob
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

from simple_data_warehouse import SimpleDataWarehouse

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class SimpleSentimentAnalyzer:
    def __init__(self, data_warehouse: SimpleDataWarehouse = None):
        """
        Initialize the Simple Sentiment Analyzer
        
        Args:
            data_warehouse: Data warehouse instance for data storage
        """
        self.data_warehouse = data_warehouse or SimpleDataWarehouse()
        self.vader_analyzer = SentimentIntensityAnalyzer()
        
        # Financial sentiment keywords
        self.financial_keywords = {
            'positive': ['bull', 'bullish', 'surge', 'rally', 'gain', 'profit', 'growth', 'adoption', 'upgrade', 'success', 'high', 'rise', 'increase', 'boost', 'momentum', 'strong', 'excellent', 'outstanding'],
            'negative': ['bear', 'bearish', 'crash', 'drop', 'loss', 'decline', 'risk', 'concern', 'warning', 'failure', 'collapse', 'plunge', 'dip', 'fall', 'decrease', 'weak', 'poor', 'terrible', 'awful'],
            'neutral': ['stable', 'maintain', 'hold', 'consolidate', 'sideways', 'range', 'flat', 'unchanged', 'steady', 'consistent']
        }
        
        logger.info("Simple Sentiment Analyzer initialized")
    
    def analyze_sentiment(self, text: str, source: str = 'unknown') -> Dict[str, Any]:
        """
        Analyze sentiment of text using multiple methods
        
        Args:
            text: Text to analyze
            source: Source of the text
            
        Returns:
            Dictionary with sentiment analysis results
        """
        if not text or not text.strip():
            return self._get_default_sentiment()
        
        # Clean text
        cleaned_text = self._clean_text(text)
        
        # VADER sentiment analysis
        vader_scores = self.vader_analyzer.polarity_scores(cleaned_text)
        
        # TextBlob sentiment analysis
        blob = TextBlob(cleaned_text)
        textblob_polarity = blob.sentiment.polarity
        textblob_subjectivity = blob.sentiment.subjectivity
        
        # Financial keyword analysis
        financial_scores = self._analyze_financial_keywords(cleaned_text)
        
        # Extract keywords
        keywords = self._extract_keywords(cleaned_text)
        
        # Combine scores
        combined_score = (
            vader_scores['compound'] * 0.5 +
            textblob_polarity * 0.3 +
            financial_scores['score'] * 0.2
        )
        
        # Determine sentiment label
        if combined_score >= 0.1:
            sentiment_label = 'positive'
        elif combined_score <= -0.1:
            sentiment_label = 'negative'
        else:
            sentiment_label = 'neutral'
        
        # Calculate confidence
        confidence = min(abs(combined_score) * 2, 1.0)
        
        result = {
            'text': text[:500],  # Truncate for storage
            'sentiment_label': sentiment_label,
            'sentiment_score': round(combined_score, 3),
            'confidence': round(confidence, 3),
            'vader_scores': {
                'positive': round(vader_scores['pos'], 3),
                'negative': round(vader_scores['neg'], 3),
                'neutral': round(vader_scores['neu'], 3),
                'compound': round(vader_scores['compound'], 3)
            },
            'textblob_scores': {
                'polarity': round(textblob_polarity, 3),
                'subjectivity': round(textblob_subjectivity, 3)
            },
            'financial_scores': financial_scores,
            'keywords': keywords,
            'analysis_method': 'simple_comprehensive',
            'source': source,
            'analyzed_at': datetime.now().isoformat()
        }
        
        return result
    
    def _clean_text(self, text: str) -> str:
        """Clean text for analysis"""
        if not text:
            return ""
        
        # Convert to lowercase
        text = text.lower()
        
        # Remove URLs
        text = re.sub(r'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+', '', text)
        
        # Remove special characters but keep important punctuation
        text = re.sub(r'[^a-zA-Z0-9\s\.\,\!\?]', ' ', text)
        
        # Remove extra whitespace
        text = re.sub(r'\s+', ' ', text).strip()
        
        return text
    
    def _analyze_financial_keywords(self, text: str) -> Dict[str, float]:
        """Analyze financial keywords in text"""
        if not text:
            return {'positive': 0.0, 'negative': 0.0, 'neutral': 0.0, 'score': 0.0}
        
        text_lower = text.lower()
        
        positive_score = 0.0
        negative_score = 0.0
        neutral_score = 0.0
        
        # Check for financial keywords
        for sentiment_type, keywords in self.financial_keywords.items():
            for keyword in keywords:
                if keyword in text_lower:
                    count = text_lower.count(keyword)
                    if sentiment_type == 'positive':
                        positive_score += count * 0.1
                    elif sentiment_type == 'negative':
                        negative_score += count * 0.1
                    else:
                        neutral_score += count * 0.05
        
        # Calculate overall score
        overall_score = positive_score - negative_score
        
        return {
            'positive': positive_score,
            'negative': negative_score,
            'neutral': neutral_score,
            'score': overall_score
        }
    
    def _extract_keywords(self, text: str, max_keywords: int = 10) -> List[str]:
        """Extract keywords from text"""
        if not text:
            return []
        
        # Simple keyword extraction
        words = text.split()
        
        # Filter out common words and short words
        stop_words = {'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them'}
        
        keywords = [word for word in words if len(word) > 2 and word not in stop_words]
        
        # Count frequency
        word_freq = {}
        for word in keywords:
            word_freq[word] = word_freq.get(word, 0) + 1
        
        # Sort by frequency and return top keywords
        sorted_keywords = sorted(word_freq.items(), key=lambda x: x[1], reverse=True)
        return [word for word, freq in sorted_keywords[:max_keywords]]
    
    def _get_default_sentiment(self) -> Dict[str, Any]:
        """Return default sentiment when text is empty"""
        return {
            'text': '',
            'sentiment_label': 'neutral',
            'sentiment_score': 0.0,
            'confidence': 0.0,
            'vader_scores': {'positive': 0.0, 'negative': 0.0, 'neutral': 1.0, 'compound': 0.0},
            'textblob_scores': {'polarity': 0.0, 'subjectivity': 0.0},
            'financial_scores': {'positive': 0.0, 'negative': 0.0, 'neutral': 1.0, 'score': 0.0},
            'keywords': [],
            'analysis_method': 'default',
            'source': 'unknown',
            'analyzed_at': datetime.now().isoformat()
        }
    
    def analyze_and_store(self, article_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Analyze sentiment and store results in data warehouse
        
        Args:
            article_data: Dictionary containing article information
            
        Returns:
            Complete analysis results with storage IDs
        """
        try:
            # Extract text for analysis
            text = article_data.get('content', '') or article_data.get('summary', '') or article_data.get('title', '')
            
            if not text:
                logger.warning("No text content found for sentiment analysis")
                return self._get_default_sentiment()
            
            # Perform sentiment analysis
            sentiment_result = self.analyze_sentiment(text, article_data.get('source', 'unknown'))
            
            # Store article in data warehouse
            article_id = self.data_warehouse.store_news_article(article_data)
            
            # Prepare sentiment data for storage
            sentiment_data = {
                'text': sentiment_result['text'],
                'sentiment_label': sentiment_result['sentiment_label'],
                'sentiment_score': sentiment_result['sentiment_score'],
                'confidence': sentiment_result['confidence'],
                'positive_score': sentiment_result['vader_scores']['positive'],
                'negative_score': sentiment_result['vader_scores']['negative'],
                'neutral_score': sentiment_result['vader_scores']['neutral'],
                'compound_score': sentiment_result['vader_scores']['compound'],
                'keywords': sentiment_result['keywords'],
                'analysis_method': sentiment_result['analysis_method']
            }
            
            # Store sentiment analysis
            sentiment_id = self.data_warehouse.store_sentiment_analysis(article_id, sentiment_data)
            
            # Add storage IDs to result
            sentiment_result['article_id'] = article_id
            sentiment_result['sentiment_id'] = sentiment_id
            
            logger.info(f"Analyzed and stored sentiment for article {article_id}")
            return sentiment_result
            
        except Exception as e:
            logger.error(f"Error in analyze_and_store: {str(e)}")
            return self._get_default_sentiment()

# Example usage
if __name__ == "__main__":
    # Initialize analyzer
    analyzer = SimpleSentimentAnalyzer()
    
    print("🧠 Simple Sentiment Analyzer Demo")
    print("=" * 40)
    
    # Test sentiment analysis
    test_texts = [
        "Bitcoin has reached a new all-time high of $100,000, showing strong bullish momentum in the crypto market!",
        "The cryptocurrency market is experiencing a significant decline with concerns about regulation.",
        "Ethereum successfully completed its latest upgrade, improving network efficiency and reducing fees."
    ]
    
    print("\n📝 Testing Sentiment Analysis:")
    for i, text in enumerate(test_texts, 1):
        result = analyzer.analyze_sentiment(text, f"test_{i}")
        print(f"   {i}. {text[:50]}...")
        print(f"      Sentiment: {result['sentiment_label']} (Score: {result['sentiment_score']}, Confidence: {result['confidence']})")
        print(f"      Keywords: {', '.join(result['keywords'][:5])}")
        print()
    
    # Test storing articles
    print("📰 Testing Article Storage:")
    articles = [
        {
            'title': 'Bitcoin Reaches New All-Time High',
            'content': test_texts[0],
            'summary': 'Bitcoin hits $100K milestone with strong bullish momentum',
            'source': 'CoinDesk',
            'url': 'https://coindesk.com/bitcoin-100k',
            'symbol': 'BTCUSDT'
        },
        {
            'title': 'Crypto Market Shows Bearish Signals',
            'content': test_texts[1],
            'summary': 'Market decline with regulatory concerns',
            'source': 'CryptoNews',
            'url': 'https://cryptonews.com/bearish-signals',
            'symbol': 'BTCUSDT'
        }
    ]
    
    for i, article in enumerate(articles, 1):
        result = analyzer.analyze_and_store(article)
        print(f"   {i}. {article['title']} → {result['sentiment_label']} ({result['confidence']:.2f})")
    
    # Get summary
    summary = analyzer.data_warehouse.get_sentiment_summary('BTCUSDT', 1)
    print(f"\n📊 Sentiment Summary:")
    print(f"   Total Articles: {summary['total_articles']}")
    print(f"   Overall Sentiment: {summary['overall_sentiment']}")
    print(f"   Average Score: {summary['average_sentiment_score']}")
    
    print(f"\n🎉 Simple Sentiment Analyzer Demo Complete!")
