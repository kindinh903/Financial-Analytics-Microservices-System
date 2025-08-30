#!/usr/bin/env python3
"""
Simple API test script for the Financial Data Crawler
"""

import requests
import json
import time

def test_api_endpoints():
    """Test all API endpoints"""
    base_url = "http://127.0.0.1:8000"
    
    print("🧪 Testing Financial Data Crawler API...")
    print("=" * 50)
    
    # Test 1: Health Check
    print("\n1️⃣ Testing Health Endpoint...")
    try:
        response = requests.get(f"{base_url}/health")
        if response.status_code == 200:
            print(f"✅ Health check: {response.json()}")
        else:
            print(f"❌ Health check failed: {response.status_code}")
    except requests.exceptions.ConnectionError:
        print("❌ Server not running. Start with: uvicorn server:app --host 127.0.0.1 --port 8000")
        return
    
    # Test 2: Root Endpoint
    print("\n2️⃣ Testing Root Endpoint...")
    try:
        response = requests.get(base_url)
        if response.status_code == 200:
            print(f"✅ Root endpoint: {response.json()}")
        else:
            print(f"❌ Root endpoint failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Root endpoint error: {e}")
    
    # Test 3: Crawl Endpoint
    print("\n3️⃣ Testing Crawl Endpoint...")
    try:
        crawl_data = {
            "symbol": "BTCUSDT",
            "include_news": True,
            "include_indicators": True
        }
        response = requests.post(f"{base_url}/crawl", json=crawl_data)
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Crawl successful: {result['status']}")
            if 'data' in result:
                data = result['data']
                if 'news_data' in data and data['news_data']:
                    print(f"📰 News articles: {len(data['news_data'].get('articles', []))}")
                if 'indicators' in data and data['indicators']:
                    print(f"📊 Indicators: RSI={data['indicators'].get('indicators', {}).get('rsi', 'N/A')}")
        else:
            print(f"❌ Crawl failed: {response.status_code}")
            print(f"Error: {response.text}")
    except Exception as e:
        print(f"❌ Crawl endpoint error: {e}")
    
    print("\n🎉 API testing completed!")

if __name__ == "__main__":
    # Wait a bit for server to start
    print("⏳ Waiting for server to start...")
    time.sleep(3)
    test_api_endpoints()
