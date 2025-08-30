#!/usr/bin/env python3
"""
Test script for the Enhanced Financial Data Crawler API
Tests all endpoints including trending headlines and sentiment analysis
"""

import requests
import json
import time

def test_enhanced_api():
    """Test all enhanced API endpoints"""
    base_url = "http://127.0.0.1:8001"
    
    print("🧪 Testing Enhanced Financial Data Crawler API...")
    print("=" * 60)
    
    # Test 1: Health Check
    print("\n1️⃣ Testing Health Endpoint...")
    try:
        response = requests.get(f"{base_url}/health")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Health check: {data['status']}")
            print(f"   Version: {data['version']}")
            print(f"   Features: {len(data['features'])}")
        else:
            print(f"❌ Health check failed: {response.status_code}")
    except requests.exceptions.ConnectionError:
        print("❌ Server not running. Start with: python enhanced_server.py")
        return
    
    # Test 2: Root Endpoint
    print("\n2️⃣ Testing Root Endpoint...")
    try:
        response = requests.get(base_url)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Root endpoint: {data['service']}")
            print(f"   Version: {data['version']}")
            print(f"   AI Features: {len(data['ai_features'])}")
        else:
            print(f"❌ Root endpoint failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Root endpoint error: {e}")
    
    # Test 3: Trending Headlines
    print("\n3️⃣ Testing Trending Headlines...")
    try:
        response = requests.get(f"{base_url}/trending")
        if response.status_code == 200:
            data = response.json()
            if data['status'] == 'success':
                trending = data['trending_headlines']
                print(f"✅ Trending headlines: {len(trending)} topics")
                for topic, info in trending.items():
                    print(f"   - {topic}: {info['sentiment']} ({info['confidence']:.2f})")
                    print(f"     Headlines: {len(info['headlines'])}")
            else:
                print(f"❌ Trending failed: {data.get('error', 'Unknown error')}")
        else:
            print(f"❌ Trending failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Trending error: {e}")
    
    # Test 4: Latest News
    print("\n4️⃣ Testing Latest News...")
    try:
        response = requests.get(f"{base_url}/news/latest?symbol=BTCUSDT&limit=5")
        if response.status_code == 200:
            data = response.json()
            if data['status'] == 'success':
                news = data['news_data']
                print(f"✅ Latest news: {news.get('total_results', 0)} articles")
                if 'articles' in news:
                    for i, article in enumerate(news['articles'][:3]):
                        sentiment = article.get('sentiment', {})
                        print(f"   {i+1}. {article['title'][:50]}...")
                        print(f"      Sentiment: {sentiment.get('sentiment', 'N/A')} ({sentiment.get('confidence', 0):.2f})")
            else:
                print(f"❌ Latest news failed: {data.get('error', 'Unknown error')}")
        else:
            print(f"❌ Latest news failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Latest news error: {e}")
    
    # Test 5: Sentiment Analysis
    print("\n5️⃣ Testing Sentiment Analysis...")
    try:
        test_texts = [
            "Bitcoin is surging to new highs with bullish momentum!",
            "Market crash causes massive losses and bearish sentiment",
            "Ethereum upgrade shows promising results"
        ]
        
        for text in test_texts:
            response = requests.get(f"{base_url}/sentiment/analyze", params={'text': text})
            if response.status_code == 200:
                data = response.json()
                if data['status'] == 'success':
                    sentiment = data['sentiment']
                    print(f"✅ '{text[:30]}...': {sentiment['sentiment']} ({sentiment['confidence']:.2f})")
                else:
                    print(f"❌ Sentiment analysis failed: {data.get('error', 'Unknown error')}")
            else:
                print(f"❌ Sentiment analysis failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Sentiment analysis error: {e}")
    
    # Test 6: News Sources
    print("\n6️⃣ Testing News Sources...")
    try:
        response = requests.get(f"{base_url}/news/sources")
        if response.status_code == 200:
            data = response.json()
            if data['status'] == 'success':
                sources = data['sources']
                print(f"✅ News sources: {len(sources)} configured")
                for domain, selectors in list(sources.items())[:3]:
                    print(f"   - {domain}: {len(selectors.get('title_selectors', []))} title selectors")
            else:
                print(f"❌ News sources failed: {data.get('error', 'Unknown error')}")
        else:
            print(f"❌ News sources failed: {response.status_code}")
    except Exception as e:
        print(f"❌ News sources error: {e}")
    
    # Test 7: Enhanced Crawl
    print("\n7️⃣ Testing Enhanced Crawl...")
    try:
        crawl_data = {
            "symbol": "BTCUSDT",
            "include_news": True,
            "include_indicators": True,
            "max_articles": 10
        }
        response = requests.post(f"{base_url}/crawl/enhanced", json=crawl_data)
        if response.status_code == 200:
            data = response.json()
            if data['status'] == 'success':
                print(f"✅ Enhanced crawl successful!")
                print(f"   Symbol: {data['symbol']}")
                if 'trending_headlines' in data:
                    print(f"   Trending topics: {len(data['trending_headlines'])}")
                if 'news_data' in data and data['news_data']:
                    print(f"   News articles: {data['news_data'].get('total_results', 0)}")
                if 'indicators' in data and data['indicators']:
                    indicators = data['indicators'].get('indicators', {})
                    if 'rsi' in indicators:
                        print(f"   RSI: {indicators['rsi']}")
            else:
                print(f"❌ Enhanced crawl failed: {data.get('error', 'Unknown error')}")
        else:
            print(f"❌ Enhanced crawl failed: {response.status_code}")
            print(f"Error: {response.text}")
    except Exception as e:
        print(f"❌ Enhanced crawl error: {e}")
    
    print("\n🎉 Enhanced API testing completed!")

if __name__ == "__main__":
    # Wait a bit for server to start
    print("⏳ Waiting for server to start...")
    time.sleep(3)
    test_enhanced_api()
