import asyncio
from fastapi import FastAPI, HTTPException
from app.schemas import PredictRequest
from app.predictor import Predictor
from app.model_store import load_model
# from app.kafka_worker import start_workers
from app.config import settings

app = FastAPI(title="AI Prediction Service")
predictor = Predictor()

@app.on_event("startup")
async def startup_event():
    # start kafka consumers/producers in background
    # asyncio.create_task(start_workers())
    pass

@app.get('/health')
async def health():
    return {"status":"ok"}

@app.post('/predict')
async def predict(req: PredictRequest):
    if req.symbol not in settings.SYMBOL_WHITELIST:
        raise HTTPException(status_code=400, detail="symbol not allowed")
    try:
        sent = req.sentiment.dict() if req.sentiment else None
        res = predictor.predict_from_candles(req.symbol, req.interval, req.candles, sentiment=sent)
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get('/meta')
async def meta():
    meta = []
    for s in settings.SYMBOL_WHITELIST:
        for inv in settings.INTERVALS:
            m = load_model(s, inv)
            meta.append({"symbol": s, "interval": inv, "has_model": bool(m)})
    return {"models": meta}

@app.post('/retrain')
async def retrain(symbol: str = None, interval: str = None):
    # This endpoint is a trigger: integration with job runner required to execute training.
    return {"status":"retrain_triggered", "symbol": symbol, "interval": interval}
