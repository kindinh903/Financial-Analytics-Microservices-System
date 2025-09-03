# 🚀 Enhanced Server Setup Guide

## 📋 Prerequisites
- Python 3.10+ ✅
- Virtual Environment ✅

## 🔧 Installation Steps

### 1. Activate Virtual Environment
```bash
# Windows
.\env\Scripts\activate

# Mac/Linux
source env/bin/activate
```

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

### 3. Download NLTK Data
```bash
python -c "import nltk; nltk.download('punkt'); nltk.download('stopwords'); nltk.download('vader_lexicon')"
```

### 4. Set Up Environment Variables
Create a `.env` file in the crawler directory:
```env
# Binance API (Optional - for real-time price data)
BINANCE_API_KEY=your_binance_api_key
BINANCE_SECRET_KEY=your_binance_secret_key

# News API (Optional - for additional news sources)
NEWS_API_KEY=your_news_api_key
```

### 5. Run the Enhanced Server
```bash
python enhanced_server.py
```

The server will start on `http://localhost:8001`

## 📊 What's Included

### Core Components:
- ✅ `enhanced_crawler.py` - Main crawler with AI-powered HTML analysis
- ✅ `enhanced_server.py` - FastAPI server with all endpoints
- ✅ `simple_data_warehouse.py` - SQLite data warehouse
- ✅ `simple_sentiment_analyzer.py` - Sentiment analysis engine

### Features:
- 🧠 **AI-powered HTML structure analysis** for 10+ financial websites
- 📈 **Enhanced sentiment analysis** with financial keywords
- 🗄️ **SQLite data warehouse** with automatic CSV export
- 🔄 **Real-time news crawling** from multiple sources
- 📊 **Trending headlines** with sentiment tracking
- 🌐 **RESTful API** with comprehensive endpoints

## 🎯 API Endpoints

### News & Crawling:
- `GET /news/enhanced` - Get enhanced news with sentiment analysis
- `GET /news/latest` - Get latest news for a symbol
- `GET /trending` - Get trending financial headlines
- `POST /crawl/enhanced` - Enhanced crawl with AI analysis

### Data Warehouse:
- `GET /data/warehouse/stats` - Get data warehouse statistics
- `GET /data/export/csv/{symbol}` - Export data to CSV
- `GET /data/sentiment/summary/{symbol}` - Get sentiment summary
- `GET /data/sentiment/trends/{symbol}` - Get sentiment trends

### Analysis:
- `GET /sentiment/analyze` - Analyze text sentiment
- `POST /data/analyze` - Analyze and store sentiment

### System:
- `GET /health` - Health check
- `GET /` - API information

## 📁 Data Storage

### SQLite Database:
- Location: `data_warehouse/sqlite/financial_data.db`
- Tables: `news_articles`, `sentiment_analysis`

### CSV Exports:
- Location: `data_warehouse/csv/`
- Format: `sentiment_analysis_{SYMBOL}_{TIMESTAMP}.csv`

### JSON Storage:
- Location: `data_warehouse/json/`
- For future JSON exports

## 🔍 Testing the Setup

### 1. Test Server Health:
```bash
curl http://localhost:8001/health
```

### 2. Test News Crawling:
```bash
curl http://localhost:8001/news/enhanced?symbol=BTCUSDT&limit=5
```

### 3. Test Data Warehouse:
```bash
curl http://localhost:8001/data/warehouse/stats
```

## 🐛 Troubleshooting

### Common Issues:

1. **Import Errors**: Make sure all dependencies are installed
   ```bash
   pip install -r requirements.txt
   ```

2. **NLTK Data Missing**: Download required NLTK data
   ```bash
   python -c "import nltk; nltk.download('punkt'); nltk.download('stopwords'); nltk.download('vader_lexicon')"
   ```

3. **Port Already in Use**: Change port in `enhanced_server.py`
   ```python
   uvicorn.run(app, host="0.0.0.0", port=8002)  # Change port
   ```

4. **Database Errors**: Delete and recreate database
   ```bash
   rm data_warehouse/sqlite/financial_data.db
   python enhanced_server.py  # Will recreate database
   ```

## 🎉 Success Indicators

When everything is working correctly, you should see:
- ✅ Server starts without errors
- ✅ Database tables are created
- ✅ News articles are crawled and stored
- ✅ CSV files are generated
- ✅ Frontend can connect to the API

## 📞 Support

If you encounter issues:
1. Check the terminal output for error messages
2. Verify all dependencies are installed
3. Ensure the virtual environment is activated
4. Check that port 8001 is available

The enhanced server is now ready to provide AI-powered financial news crawling and sentiment analysis! 🚀
