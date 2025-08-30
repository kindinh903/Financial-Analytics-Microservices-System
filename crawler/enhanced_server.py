from fastapi import FastAPI, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
import asyncio
import json
from datetime import datetime
from enhanced_crawler import EnhancedFinancialCrawler, crawl_financial_data_enhanced
from pydantic import BaseModel
from typing import Optional, List
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Enhanced Financial Data Crawler API", version="2.0.0")

# Allow calls from any frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize enhanced crawler
enhanced_crawler = EnhancedFinancialCrawler()

class EnhancedCrawlRequest(BaseModel):
    symbol: str
    include_news: Optional[bool] = True
    include_indicators: Optional[bool] = True
    max_articles: Optional[int] = 50

class TrendingRequest(BaseModel):
    force_refresh: Optional[bool] = False

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
        
        return {
            "status": "success",
            "symbol": symbol,
            "news_data": news_data,
            "timestamp": datetime.now().isoformat()
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

# Background task to update trending topics
@app.on_event("startup")
async def startup_event():
    """Initialize trending topics on startup"""
    try:
        logger.info("Initializing enhanced crawler...")
        # Pre-populate trending topics
        enhanced_crawler.get_trending_headlines(force_refresh=True)
        logger.info("Enhanced crawler initialized successfully")
    except Exception as e:
        logger.error(f"Startup error: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
