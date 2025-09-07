from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import pandas as pd
from app.predictor import predict_next_close
from fastapi.responses import PlainTextResponse

app = FastAPI(title="Prediction Service", version="1.0")


# Request schema
class OHLCVRequest(BaseModel):
    data: list  # danh sách các cây nến OHLCV (dict)
    model_dir: str = "models"  # thư mục model


@app.get("/health", response_class=PlainTextResponse)
def health():
    return "OK"

@app.post("/predict")
def predict(request: OHLCVRequest):
    try:
        df = pd.DataFrame(request.data)

        if "symbol" not in df.columns or "interval" not in df.columns:
            raise HTTPException(status_code=400, detail="Thiếu symbol hoặc interval trong dữ liệu")

        # Bổ sung datetime từ timestamp nếu thiếu
        if "datetime" not in df.columns and "close_time" in df.columns:
            df["datetime"] = pd.to_datetime(df["close_time"], unit="ms")

        result = predict_next_close(df, request.model_dir)
        return {"status": "success", "result": result}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
