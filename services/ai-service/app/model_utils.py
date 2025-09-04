from functools import lru_cache
import joblib
import json
from pathlib import Path

@lru_cache(maxsize=None)
def load_model(symbol: str, interval: str, model_dir: str = "models"):
    model_dir = Path(model_dir) / f"{symbol}_{interval}"
    model_path = model_dir / "model.pkl"
    meta_path = model_dir / "meta.json"

    if not model_path.exists() or not meta_path.exists():
        raise FileNotFoundError(f"Model or meta not found in {model_dir}")

    model = joblib.load(model_path)
    with open(meta_path, "r") as f:
        meta = json.load(f)

    return model, meta

