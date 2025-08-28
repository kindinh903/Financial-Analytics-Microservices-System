import os, joblib
from app.config import settings

MODEL_DIR = settings.MODEL_DIR

def model_path(symbol: str, interval: str, model_name: str = "prophet") -> str:
    safe = f"{symbol}_{interval}_{model_name}.pkl"
    return os.path.join(MODEL_DIR, safe)

def save_model(obj, symbol: str, interval: str, model_name: str = "prophet"):
    path = model_path(symbol, interval, model_name)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    joblib.dump(obj, path)
    return path

def load_model(symbol: str, interval: str, model_name: str = "prophet"):
    path = model_path(symbol, interval, model_name)
    if not os.path.exists(path):
        return None
    return joblib.load(path)
