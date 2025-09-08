from fastapi import FastAPI, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
import asyncio
import json
from datetime import datetime
from enhanced_crawler import EnhancedFinancialCrawler, crawl_financial_data_enhanced
from simple_data_warehouse import SimpleDataWarehouse
from simple_sentiment_analyzer import SimpleSentimentAnalyzer
from pydantic import BaseModel
from typing import Optional, List
import logging
import threading
import time
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Enhanced Financial Data Crawler API", version="2.0.0")

# CORS disabled - handled by gateway
# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["*"],
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )

# Initialize enhanced crawler
enhanced_crawler = EnhancedFinancialCrawler()

# Initialize background scheduler for auto-crawling
scheduler = BackgroundScheduler()

# Track auto-crawling status
auto_crawling_active = False
auto_crawling_symbols = ['BTCUSDT', 'ETHUSDT', 'ADAUSDT', 'SOLUSDT', 'DOTUSDT']  # Default symbols to track
auto_crawling_interval = 1800  # 30 minutes default interval to prevent NewsAPI rate limiting

class EnhancedCrawlRequest(BaseModel):
    symbol: str
    include_news: Optional[bool] = True
    include_indicators: Optional[bool] = True
    max_articles: Optional[int] = 50

class TrendingRequest(BaseModel):
    force_refresh: Optional[bool] = False

class AutoCrawlConfig(BaseModel):
    symbols: List[str]
    interval_seconds: int = 300  # 5 minutes default
    enable: bool = True

async def auto_crawl_news_for_symbol(symbol: str):
    """Auto-crawl news for a specific symbol"""
    try:
        logger.info(f"Auto-crawling news for {symbol}")
        
        # Crawl news for the symbol
        keywords = [symbol.replace('USDT', ''), 'cryptocurrency', 'trading']
        news_data = await enhanced_crawler.crawl_multiple_sources_async(keywords, max_articles=10)
        
        if news_data and news_data.get('articles'):
            # Store articles in data warehouse
            for article in news_data['articles']:
                try:
                    enhanced_article = enhanced_crawler.store_article_with_sentiment(article)
                    logger.info(f"Auto-stored news article for {symbol}: {article.get('title', 'Unknown')[:50]}...")
                except Exception as e:
                    logger.error(f"Error storing auto-crawled article for {symbol}: {str(e)}")
            
            logger.info(f"Auto-crawled {len(news_data['articles'])} articles for {symbol}")
        else:
            logger.warning(f"No articles found in auto-crawl for {symbol}")
            
    except Exception as e:
        logger.error(f"Error in auto-crawl for {symbol}: {str(e)}")

def auto_crawl_job():
    """Background job to auto-crawl news for all tracked symbols"""
    try:
        logger.info("Starting auto-crawl job for all symbols")
        
        # Create a new event loop for the background job
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        async def crawl_all_symbols():
            tasks = []
            for symbol in auto_crawling_symbols:
                task = auto_crawl_news_for_symbol(symbol)
                tasks.append(task)
            
            # Run all crawling tasks concurrently
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            # Log results
            for i, result in enumerate(results):
                symbol = auto_crawling_symbols[i]
                if isinstance(result, Exception):
                    logger.error(f"Error auto-crawling {symbol}: {str(result)}")
                else:
                    logger.info(f"Successfully auto-crawled {symbol}")
        
        # Run the async function in the new event loop
        loop.run_until_complete(crawl_all_symbols())
        loop.close()
        logger.info("Auto-crawl job completed")
        
    except Exception as e:
        logger.error(f"Error in auto-crawl job: {str(e)}")

def start_auto_crawling():
    """Start the auto-crawling scheduler"""
    global auto_crawling_active
    
    if not auto_crawling_active:
        try:
            # Add job to scheduler
            scheduler.add_job(
                func=auto_crawl_job,
                trigger=IntervalTrigger(seconds=auto_crawling_interval),
                id='auto_crawl_news',
                name='Auto-crawl financial news',
                replace_existing=True
            )
            
            # Start scheduler
            scheduler.start()
            auto_crawling_active = True
            logger.info(f"Auto-crawling started with {auto_crawling_interval}s interval for symbols: {auto_crawling_symbols}")
            
        except Exception as e:
            logger.error(f"Error starting auto-crawling: {str(e)}")

def stop_auto_crawling():
    """Stop the auto-crawling scheduler"""
    global auto_crawling_active
    
    if auto_crawling_active:
        try:
            scheduler.shutdown()
            auto_crawling_active = False
            logger.info("Auto-crawling stopped")
        except Exception as e:
            logger.error(f"Error stopping auto-crawling: {str(e)}")

def update_auto_crawling_config(symbols: List[str], interval_seconds: int):
    """Update auto-crawling configuration"""
    global auto_crawling_symbols, auto_crawling_interval
    
    auto_crawling_symbols = symbols
    auto_crawling_interval = interval_seconds
    
    # Restart scheduler with new config
    if auto_crawling_active:
        stop_auto_crawling()
        start_auto_crawling()
    
    logger.info(f"Auto-crawling config updated: symbols={symbols}, interval={interval_seconds}s")

@app.post("/crawl/enhanced")
async def enhanced_crawl(req: EnhancedCrawlRequest):
    """Enhanced crawl with AI-powered HTML analysis and better sentiment"""
    try:
        result = await crawl_financial_data_enhanced(
            req.symbol, 
            include_news=req.include_news, 
            include_indicators=req.include_indicators,
            max_articles=req.max_articles
        )
        
        if result['status'] == 'success':
            data = result.get("data", {})
            return {
                "status": "success",
                "symbol": req.symbol,
                "price_data": data.get("price_data"),
                "market_overview": data.get("market_overview"),
                "news_data": data.get("news_data"),
                "indicators": data.get("indicators"),
                "trending_headlines": data.get("trending_headlines"),
                "file_path": result.get("file_path"),
                "excel_path": result.get("excel_path"),
                "crawled_at": datetime.now().isoformat()
            }
        else:
            return {"status": "error", "error": result.get("error", "Unknown error")}
            
    except Exception as e:
        logger.error(f"Enhanced crawl error: {str(e)}")
        return {"status": "error", "error": str(e)}

@app.get("/trending")
async def get_trending_headlines(req: TrendingRequest = TrendingRequest()):
    """Get trending financial headlines with real-time sentiment"""
    try:
        trending_data = enhanced_crawler.get_trending_headlines(force_refresh=req.force_refresh)
        
        return {
            "status": "success",
            "trending_headlines": trending_data,
            "cached": not req.force_refresh,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Trending headlines error: {str(e)}")
        return {"status": "error", "error": str(e)}

@app.get("/news/latest")
async def get_latest_news(symbol: str = "BTCUSDT", limit: int = 20):
    """Get latest news for a specific symbol"""
    try:
        keywords = [symbol.replace('USDT', ''), 'cryptocurrency', 'trading', 'blockchain']
        news_data = await enhanced_crawler.crawl_multiple_sources_async(keywords, limit)
        
        # Store articles in data warehouse
        if news_data and 'articles' in news_data:
            stored_count = 0
            for article in news_data['articles']:
                try:
                    # Store article in data warehouse
                    enhanced_crawler.store_article_with_sentiment(article)
                    stored_count += 1
                except Exception as e:
                    logger.error(f"Error storing article: {str(e)}")
            
            logger.info(f"Stored {stored_count} articles in data warehouse for {symbol}")
            
            # Auto-export to CSV after storing articles
            if stored_count > 0:
                try:
                    csv_path = enhanced_crawler.data_warehouse.export_to_csv(symbol)
                    logger.info(f"Auto-exported {stored_count} articles to CSV: {csv_path}")
                except Exception as e:
                    logger.error(f"Error auto-exporting CSV: {str(e)}")
        
        return {
            "status": "success",
            "symbol": symbol,
            "news_data": news_data,
            "timestamp": datetime.now().isoformat(),
            "stored_count": stored_count if 'articles' in news_data else 0
        }
        
    except Exception as e:
        logger.error(f"Latest news error: {str(e)}")
        return {"status": "error", "error": str(e)}

@app.get("/sentiment/analyze")
async def analyze_sentiment(text: str):
    """Analyze sentiment of financial text"""
    try:
        sentiment = enhanced_crawler.analyze_sentiment_enhanced(text)
        
        return {
            "status": "success",
            "text": text,
            "sentiment": sentiment,
            "analyzed_at": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Sentiment analysis error: {str(e)}")
        return {"status": "error", "error": str(e)}

@app.get("/news/enhanced")
async def get_enhanced_news(symbol: str = "BTCUSDT", limit: int = 20):
    """Get enhanced news with guaranteed data warehouse storage"""
    try:
        keywords = [symbol.replace('USDT', ''), 'cryptocurrency', 'trading', 'blockchain']
        news_data = await enhanced_crawler.crawl_multiple_sources_async(keywords, limit)
        
        # Store articles in data warehouse
        stored_count = 0
        if news_data and 'articles' in news_data:
            for article in news_data['articles']:
                try:
                    # Store article in data warehouse
                    enhanced_crawler.store_article_with_sentiment(article)
                    stored_count += 1
                except Exception as e:
                    logger.error(f"Error storing article: {str(e)}")
            
            logger.info(f"Stored {stored_count} articles in data warehouse for {symbol}")
            
            # Auto-export to CSV after storing articles
            if stored_count > 0:
                try:
                    csv_path = enhanced_crawler.data_warehouse.export_to_csv(symbol)
                    logger.info(f"Auto-exported {stored_count} articles to CSV: {csv_path}")
                except Exception as e:
                    logger.error(f"Error auto-exporting CSV: {str(e)}")
        
        return {
            "status": "success",
            "symbol": symbol,
            "news_data": news_data,
            "timestamp": datetime.now().isoformat(),
            "stored_count": stored_count
        }
        
    except Exception as e:
        logger.error(f"Enhanced news error: {str(e)}")
        return {"status": "error", "error": str(e)}

@app.get("/news/stored")
async def get_stored_news(symbol: str = "BTCUSDT", limit: int = 50):
    """Get stored news from SQLite database without triggering new crawl"""
    try:
        # Get stored articles from SQLite database
        stored_articles = enhanced_crawler.data_warehouse.get_recent_articles(limit=limit)
        
        if not stored_articles:
            return {
                "status": "success",
                "news_data": {"articles": []},
                "message": "No stored articles found",
                "timestamp": datetime.now().isoformat()
            }
        
        # Format the stored articles
        formatted_articles = []
        for article in stored_articles:
            formatted_article = {
                "title": article.get('title', ''),
                "description": article.get('title', ''),  # Use title as description for now
                "url": article.get('url', ''),
                "source": article.get('source', ''),
                "published_at": article.get('published_at', ''),
                "sentiment": article.get('sentiment', 'neutral'),
                "confidence": article.get('confidence', 0.5),
                "keywords": article.get('keywords', ''),
                "score": article.get('score', 0.0)
            }
            formatted_articles.append(formatted_article)
        
        return {
            "status": "success",
            "news_data": {"articles": formatted_articles},
            "count": len(formatted_articles),
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Stored news error: {str(e)}")
        return {"error": str(e), "news_data": {"articles": []}}

@app.get("/news/sources")
async def get_news_sources():
    """Get available news sources and their HTML structure patterns"""
    try:
        sources_info = {}
        for domain, selectors in enhanced_crawler.news_sources.items():
            sources_info[domain] = {
                "title_selectors": selectors.get('title_selectors', []),
                "content_selectors": selectors.get('content_selectors', []),
                "date_selectors": selectors.get('date_selectors', []),
                "author_selectors": selectors.get('author_selectors', [])
            }
        
        return {
            "status": "success",
            "sources": sources_info,
            "total_sources": len(sources_info),
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"News sources error: {str(e)}")
        return {"status": "error", "error": str(e)}

@app.get("/trending/stream")
async def stream_trending_updates():
    """Stream real-time trending updates"""
    async def generate():
        while True:
            try:
                trending_data = enhanced_crawler.get_trending_headlines(force_refresh=True)
                
                yield f"data: {json.dumps(trending_data)}\n\n"
                
                # Wait 30 seconds before next update
                await asyncio.sleep(30)
                
            except Exception as e:
                logger.error(f"Streaming error: {str(e)}")
                yield f"data: {json.dumps({'error': str(e)})}\n\n"
                await asyncio.sleep(5)
    
    return StreamingResponse(generate(), media_type="text/plain")

@app.get("/health")
def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy", 
        "service": "enhanced-financial-data-crawler",
        "version": "2.0.0",
        "features": [
            "AI-powered HTML structure analysis",
            "Enhanced sentiment analysis",
            "Multi-source news crawling",
            "Real-time trending headlines",
            "Async web scraping"
        ],
        "timestamp": datetime.now().isoformat()
    }

@app.get("/")
def root():
    """Root endpoint with enhanced API information"""
    return {
        "service": "Enhanced Financial Data Crawler API",
        "version": "2.0.0",
        "description": "Advanced financial news crawling with AI-powered HTML analysis and enhanced sentiment detection",
        "endpoints": {
            "POST /crawl/enhanced": "Enhanced crawl with AI analysis",
            "GET /trending": "Get trending headlines",
            "GET /news/latest": "Get latest news for symbol",
            "GET /sentiment/analyze": "Analyze text sentiment",
            "GET /news/sources": "Get available news sources",
            "GET /trending/stream": "Stream real-time updates",
            "GET /health": "Health check",
            "GET /": "API information"
        },
        "example_request": {
            "symbol": "BTCUSDT",
            "include_news": True,
            "include_indicators": True,
            "max_articles": 50
        },
        "ai_features": [
            "HTML structure analysis for 10+ financial websites",
            "Enhanced sentiment analysis with financial keywords",
            "Multi-source asynchronous crawling",
            "Real-time trending topic detection",
            "Intelligent content extraction"
        ]
    }

# Data Warehouse Endpoints
@app.get("/data/sentiment/summary/{symbol}")
async def get_sentiment_summary(symbol: str, days: int = 7):
    """Get sentiment analysis summary for a symbol"""
    try:
        summary = enhanced_crawler.data_warehouse.get_sentiment_summary(symbol, days)
        return {
            "status": "success",
            "data": summary,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Error getting sentiment summary: {str(e)}")
        return {
            "status": "error",
            "message": str(e),
            "timestamp": datetime.now().isoformat()
        }

@app.get("/data/sentiment/trends/{symbol}")
async def get_sentiment_trends(symbol: str, days: int = 7):
    """Get sentiment trends for a symbol"""
    try:
        # Get trends from data warehouse instead
        articles = enhanced_crawler.data_warehouse.get_all_articles(symbol, 100)
        trends = {
            'symbol': symbol,
            'period_days': days,
            'total_articles': len(articles),
            'articles': articles[:10]  # Return first 10 articles as trends
        }
        return {
            "status": "success",
            "data": trends,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Error getting sentiment trends: {str(e)}")
        return {
            "status": "error",
            "message": str(e),
            "timestamp": datetime.now().isoformat()
        }

@app.get("/data/export/csv/{symbol}")
async def export_sentiment_csv(symbol: str, days: int = 30):
    """Export sentiment analysis data to CSV"""
    try:
        csv_path = enhanced_crawler.data_warehouse.export_to_csv(symbol)
        
        # Get article count for confirmation
        articles = enhanced_crawler.data_warehouse.get_all_articles(symbol, 1000)
        
        return {
            "status": "success",
            "message": f"Data exported to {csv_path}",
            "file_path": csv_path,
            "articles_exported": len(articles),
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Error exporting CSV: {str(e)}")
        return {
            "status": "error",
            "message": str(e),
            "timestamp": datetime.now().isoformat()
        }

@app.post("/data/analyze")
async def analyze_text_sentiment(text: str, source: str = "api"):
    """Analyze sentiment of provided text"""
    try:
        result = enhanced_crawler.sentiment_analyzer.analyze_sentiment(text, source)
        return {
            "status": "success",
            "data": result,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Error analyzing sentiment: {str(e)}")
        return {
            "status": "error",
            "message": str(e),
            "timestamp": datetime.now().isoformat()
        }

@app.get("/data/warehouse/stats")
async def get_warehouse_stats():
    """Get data warehouse statistics"""
    try:
        # This would require additional methods in the data warehouse
        # For now, return basic info
        return {
            "status": "success",
            "data": {
                "warehouse_location": str(enhanced_crawler.data_warehouse.data_dir),
                "database_path": str(enhanced_crawler.data_warehouse.db_path),
                "features": [
                    "SQLite database storage",
                    "CSV export functionality", 
                    "Sentiment analysis tracking",
                    "Historical trend analysis",
                    "News article storage"
                ]
            },
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Error getting warehouse stats: {str(e)}")
        return {
            "status": "error",
            "message": str(e),
            "timestamp": datetime.now().isoformat()
        }

# Auto-crawling control endpoints
@app.post("/auto-crawl/start")
async def start_auto_crawl():
    """Start automatic news crawling"""
    try:
        start_auto_crawling()
        return {
            "status": "success",
            "message": "Auto-crawling started",
            "symbols": auto_crawling_symbols,
            "interval_seconds": auto_crawling_interval,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Error starting auto-crawl: {str(e)}")
        return {
            "status": "error",
            "message": str(e),
            "timestamp": datetime.now().isoformat()
        }

@app.post("/auto-crawl/stop")
async def stop_auto_crawl():
    """Stop automatic news crawling"""
    try:
        stop_auto_crawling()
        return {
            "status": "success",
            "message": "Auto-crawling stopped",
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Error stopping auto-crawl: {str(e)}")
        return {
            "status": "error",
            "message": str(e),
            "timestamp": datetime.now().isoformat()
        }

@app.get("/auto-crawl/status")
async def get_auto_crawl_status():
    """Get auto-crawling status"""
    try:
        return {
            "status": "success",
            "active": auto_crawling_active,
            "symbols": auto_crawling_symbols,
            "interval_seconds": auto_crawling_interval,
            "next_run": "N/A" if not auto_crawling_active else "Scheduled",
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Error getting auto-crawl status: {str(e)}")
        return {
            "status": "error",
            "message": str(e),
            "timestamp": datetime.now().isoformat()
        }

@app.post("/auto-crawl/config")
async def update_auto_crawl_config(config: AutoCrawlConfig):
    """Update auto-crawling configuration"""
    try:
        update_auto_crawling_config(config.symbols, config.interval_seconds)
        
        if config.enable and not auto_crawling_active:
            start_auto_crawling()
        elif not config.enable and auto_crawling_active:
            stop_auto_crawling()
        
        return {
            "status": "success",
            "message": "Auto-crawling configuration updated",
            "symbols": auto_crawling_symbols,
            "interval_seconds": auto_crawling_interval,
            "active": auto_crawling_active,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Error updating auto-crawl config: {str(e)}")
        return {
            "status": "error",
            "message": str(e),
            "timestamp": datetime.now().isoformat()
        }

@app.post("/auto-crawl/trigger")
async def trigger_auto_crawl():
    """Manually trigger auto-crawl for all symbols"""
    try:
        logger.info("Manually triggering auto-crawl")
        
        # Run auto-crawl job immediately
        auto_crawl_job()
        
        return {
            "status": "success",
            "message": "Auto-crawl triggered successfully",
            "symbols": auto_crawling_symbols,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Error triggering auto-crawl: {str(e)}")
        return {
            "status": "error",
            "message": str(e),
            "timestamp": datetime.now().isoformat()
        }

# Background task to update trending topics
@app.on_event("startup")
async def startup_event():
    """Initialize trending topics on startup"""
    try:
        logger.info("Initializing enhanced crawler...")
        # Pre-populate trending topics
        enhanced_crawler.get_trending_headlines(force_refresh=True)
        
        # Start auto-crawling by default
        start_auto_crawling()
        
        logger.info("Enhanced crawler initialized successfully")
    except Exception as e:
        logger.error(f"Startup error: {str(e)}")

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    try:
        stop_auto_crawling()
        logger.info("Enhanced crawler shutdown complete")
    except Exception as e:
        logger.error(f"Shutdown error: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
