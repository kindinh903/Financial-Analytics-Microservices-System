from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from main import crawl_financial_data  # Updated import
from pydantic import BaseModel
from typing import Optional

app = FastAPI(title="Financial Data Crawler API", version="1.0.0")

# Allow calls from any frontend (localhost:3000 for example)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Or ["http://localhost:3000"] for better security
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class FinancialCrawlRequest(BaseModel):
    symbol: str
    include_news: Optional[bool] = True
    include_indicators: Optional[bool] = True

@app.post("/crawl")
def crawl(req: FinancialCrawlRequest):
    """Crawl financial data for a specific symbol"""
    result = crawl_financial_data(
        req.symbol, 
        include_news=req.include_news, 
        include_indicators=req.include_indicators
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
            "file_path": result.get("file_path"),
            "excel_path": result.get("excel_path")
        }
    else:
        return {"status": "error", "error": result.get("error", "Unknown error")}

@app.get("/health")
def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "financial-data-crawler"}

@app.get("/")
def root():
    """Root endpoint with API information"""
    return {
        "service": "Financial Data Crawler API",
        "version": "1.0.0",
        "endpoints": {
            "POST /crawl": "Crawl financial data for a symbol",
            "GET /health": "Health check",
            "GET /": "API information"
        },
        "example_request": {
            "symbol": "BTCUSDT",
            "include_news": True,
            "include_indicators": True
        }
    }