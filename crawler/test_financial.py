#!/usr/bin/env python3
"""
Test script for the Financial Data Crawler
This script tests the crawler without requiring real API keys
"""

import json
import os
from datetime import datetime
from main import FinancialDataCrawler

def test_crawler_without_api_keys():
    """Test the crawler functionality without requiring real API keys"""
    print("🧪 Testing Financial Data Crawler...")
    
    # Create crawler instance
    crawler = FinancialDataCrawler()
    
    # Test sentiment analysis
    print("\n📊 Testing Sentiment Analysis...")
    test_texts = [
        "Bitcoin surges to new all-time high!",
        "Market crash causes massive losses",
        "Ethereum upgrade shows promising results",
        "Federal Reserve maintains interest rates"
    ]
    
    for text in test_texts:
        sentiment = crawler.analyze_sentiment(text)
        print(f"Text: '{text}'")
        print(f"Sentiment: {sentiment['sentiment']} (confidence: {sentiment['confidence']:.2f})")
        print()
    
    # Test manual news generation
    print("📰 Testing News Generation...")
    keywords = ["Bitcoin", "cryptocurrency", "trading"]
    news_data = crawler.get_manual_news(keywords)
    
    print(f"Generated {len(news_data['articles'])} news articles:")
    for article in news_data['articles']:
        print(f"- {article['title']}")
        print(f"  Sentiment: {article['sentiment']['sentiment']}")
        print()
    
    # Test technical indicators calculation
    print("📈 Testing Technical Indicators...")
    # Create sample price data
    sample_prices = [100 + i * 0.5 + (i % 3 - 1) * 2 for i in range(100)]
    
    rsi = crawler.calculate_rsi(sample_prices)
    macd, signal = crawler.calculate_macd(sample_prices)
    
    print(f"Sample prices: {sample_prices[-5:]}...")
    print(f"RSI: {rsi}")
    print(f"MACD: {macd}, Signal: {signal}")
    print()
    
    # Test data export
    print("💾 Testing Data Export...")
    test_data = {
        'price_data': {
            'symbol': 'BTCUSDT',
            'price': 50000.0,
            'timestamp': datetime.now().isoformat(),
            'source': 'test'
        },
        'news_data': news_data,
        'indicators': {
            'symbol': 'BTCUSDT',
            'timestamp': datetime.now().isoformat(),
            'indicators': {
                'rsi': rsi,
                'macd': macd,
                'macd_signal': signal
            },
            'source': 'test'
        }
    }
    
    excel_path = crawler.export_to_excel(test_data, "test_financial_data.xlsx")
    if excel_path:
        print(f"✅ Data exported to: {excel_path}")
    else:
        print("❌ Data export failed")
    
    print("\n🎉 All tests completed!")

def test_api_endpoints():
    """Test the API endpoints if server is running"""
    import requests
    
    base_url = "http://localhost:8000"
    
    try:
        # Test health endpoint
        response = requests.get(f"{base_url}/health")
        if response.status_code == 200:
            print(f"✅ Health check: {response.json()}")
        else:
            print(f"❌ Health check failed: {response.status_code}")
        
        # Test root endpoint
        response = requests.get(base_url)
        if response.status_code == 200:
            print(f"✅ Root endpoint: {response.json()}")
        else:
            print(f"❌ Root endpoint failed: {response.status_code}")
            
    except requests.exceptions.ConnectionError:
        print("⚠️  Server not running. Start with: uvicorn server:app --host 0.0.0.0 --port 8000")

if __name__ == "__main__":
    print("🚀 Financial Data Crawler Test Suite")
    print("=" * 50)
    
    # Test core functionality
    test_crawler_without_api_keys()
    
    print("\n" + "=" * 50)
    print("🌐 Testing API Endpoints...")
    
    # Test API endpoints
    test_api_endpoints()
    
    print("\n✨ Test suite completed!")
