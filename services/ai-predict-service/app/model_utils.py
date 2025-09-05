from functools import lru_cache
from pathlib import Path
import joblib, json, os
from app.config import settings
from app.minio_client import minio_client

@lru_cache(maxsize=None)
def load_model(symbol: str, interval: str, model_dir: str = "models"):
    model_dir = Path(model_dir) / f"{symbol}_{interval}"
    model_path = model_dir / "model.pkl"
    meta_path = model_dir / "meta.json"

    # Nếu local không có thì tải từ MinIO
    if not model_path.exists() or not meta_path.exists():
        print(f"Local model not found for {symbol}_{interval}, trying MinIO...")
        model_dir.mkdir(parents=True, exist_ok=True)

        for file in ["model.pkl", "meta.json"]:
            object_name = f"{symbol}_{interval}/{file}"
            local_path = model_dir / file
            try:
                minio_client.fget_object(settings.BUCKET_NAME, object_name, str(local_path))
                print(f"Downloaded {object_name} from MinIO.")
            except Exception as e:
                raise FileNotFoundError(f"Cannot load {file} from local or MinIO: {e}")

    # Load model + meta từ local
    model = joblib.load(model_path)
    with open(meta_path, "r") as f:
        meta = json.load(f)

    return model, meta


