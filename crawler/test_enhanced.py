#!/usr/bin/env python3
"""
Test script for the Enhanced Financial Data Crawler
Tests AI-powered HTML analysis, enhanced sentiment, and trending headlines
"""

import asyncio
import json
import time
from enhanced_crawler import EnhancedFinancialCrawler, crawl_financial_data_enhanced

async def test_enhanced_crawler():
    """Test the enhanced crawler functionality"""
    print("🚀 Testing Enhanced Financial Data Crawler...")
    print("=" * 60)
    
    # Create enhanced crawler instance
    crawler = EnhancedFinancialCrawler()
    
    # Test 1: Enhanced Sentiment Analysis
    print("\n1️⃣ Testing Enhanced Sentiment Analysis...")
    test_texts = [
        "Bitcoin surges to new all-time high with bullish momentum!",
        "Market crash causes massive losses and bearish sentiment",
        "Ethereum upgrade shows promising results and adoption growth",
        "Federal Reserve maintains stable interest rates",
        "DeFi protocols show strong growth and innovation success"
    ]
    
    for text in test_texts:
        sentiment = crawler.analyze_sentiment_enhanced(text)
        print(f"Text: '{text}'")
        print(f"Sentiment: {sentiment['sentiment']} (confidence: {sentiment['confidence']:.2f}, score: {sentiment['score']:.3f})")
        if 'keyword_scores' in sentiment:
            print(f"Keywords: {sentiment['keyword_scores']}")
        print()
    
    # Test 2: Trending Headlines
    print("\n2️⃣ Testing Trending Headlines...")
    trending_data = crawler.get_trending_headlines()
    print(f"Generated {len(trending_data)} trending topics:")
    for topic, info in trending_data.items():
        print(f"- {topic}: {info['sentiment']} (confidence: {info['confidence']:.2f})")
        for headline in info['headlines'][:2]:  # Show first 2 headlines
            print(f"  • {headline}")
        print()
    
    # Test 3: Manual News Generation
    print("\n3️⃣ Testing Enhanced News Generation...")
    keywords = ["Bitcoin", "cryptocurrency", "trading", "blockchain"]
    news_data = crawler.get_manual_news_enhanced(keywords)
    
    print(f"Generated {len(news_data)} enhanced news articles:")
    for article in news_data:
        print(f"- {article['title']}")
        sentiment = article['sentiment']
        print(f"  Sentiment: {sentiment['sentiment']} (confidence: {sentiment['confidence']:.2f})")
        if 'keyword_scores' in sentiment:
            print(f"  Keywords: {sentiment['keyword_scores']}")
        print()
    
    # Test 4: Full Enhanced Crawl
    print("\n4️⃣ Testing Full Enhanced Crawl...")
    try:
        result = await crawl_financial_data_enhanced("BTCUSDT", include_news=True, include_indicators=True, max_articles=20)
        
        if result['status'] == 'success':
            print(f"✅ Enhanced crawl successful!")
            print(f"📁 Data saved to: {result['file_path']}")
            if 'excel_path' in result and result['excel_path']:
                print(f"📊 Excel data saved to: {result['excel_path']}")
            
            data = result.get('data', {})
            
            # Show trending headlines
            if 'trending_headlines' in data:
                print(f"📈 Trending topics: {len(data['trending_headlines'])}")
                for topic, info in data['trending_headlines'].items():
                    print(f"  - {topic}: {info['sentiment']} ({info['confidence']:.2f})")
            
            # Show news data
            if 'news_data' in data and data['news_data']:
                articles = data['news_data'].get('articles', [])
                print(f"📰 News articles: {len(articles)}")
                
                # Show sentiment distribution
                sentiment_counts = {}
                for article in articles:
                    sentiment = article.get('sentiment', {}).get('sentiment', 'unknown')
                    sentiment_counts[sentiment] = sentiment_counts.get(sentiment, 0) + 1
                
                print("Sentiment distribution:")
                for sentiment, count in sentiment_counts.items():
                    print(f"  - {sentiment}: {count}")
            
            # Show indicators
            if 'indicators' in data and data['indicators']:
                indicators = data['indicators'].get('indicators', {})
                print(f"📊 Technical indicators:")
                if 'rsi' in indicators:
                    print(f"  - RSI: {indicators['rsi']}")
                if 'macd' in indicators:
                    print(f"  - MACD: {indicators['macd']}")
        else:
            print(f"❌ Enhanced crawl failed: {result.get('error', 'Unknown error')}")
            
    except Exception as e:
        print(f"❌ Enhanced crawl error: {str(e)}")
    
    print("\n🎉 Enhanced crawler testing completed!")

async def test_news_sources():
    """Test news sources and HTML structure analysis"""
    print("\n🔍 Testing News Sources & HTML Analysis...")
    print("=" * 60)
    
    crawler = EnhancedFinancialCrawler()
    
    print(f"Available news sources: {len(crawler.news_sources)}")
    for domain, selectors in crawler.news_sources.items():
        print(f"\n📰 {domain}:")
        print(f"  Title selectors: {len(selectors.get('title_selectors', []))}")
        print(f"  Content selectors: {len(selectors.get('content_selectors', []))}")
        print(f"  Date selectors: {len(selectors.get('date_selectors', []))}")
        print(f"  Author selectors: {len(selectors.get('author_selectors', []))}")
    
    print("\n✅ News sources configuration completed!")

def main():
    """Main test function"""
    print("🧪 Enhanced Financial Data Crawler Test Suite")
    print("=" * 60)
    
    # Test enhanced crawler
    asyncio.run(test_enhanced_crawler())
    
    # Test news sources
    asyncio.run(test_news_sources())
    
    print("\n✨ All tests completed successfully!")

if __name__ == "__main__":
    main()
