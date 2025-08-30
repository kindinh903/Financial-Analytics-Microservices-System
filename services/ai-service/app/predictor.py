import json
import joblib
import numpy as np
import pandas as pd
from pathlib import Path
from train.train_one import ensure_datetime, compute_technical_indicators, create_lag_features


def prepare_features_for_predict(df: pd.DataFrame, feature_columns: list, seq_len: int = 20):
    df = ensure_datetime(df)

    # sentiment mặc định 0 nếu không có
    if "sentiment" not in df.columns:
        df["sentiment"] = 0.0

    # sentiment features
    df["sentiment_diff"] = df["sentiment"].diff()
    df["sentiment_ma3"] = df["sentiment"].rolling(window=3).mean()
    df["sentiment_vol7"] = df["sentiment"].rolling(window=7).std()

    df = compute_technical_indicators(df)
    df = create_lag_features(df, seq_len=seq_len, use_close_lags=True)

    # lấy hàng cuối cùng không NaN
    candidate = df[feature_columns].dropna().tail(1)
    if len(candidate) == 0:
        raise ValueError("Không đủ dữ liệu để tạo features, cần thêm nhiều nến hơn")

    return candidate, df


def predict_next_close(df: pd.DataFrame, model_dir: str = "models") -> dict:
    symbol = df["symbol"].iloc[0]
    interval = df["interval"].iloc[0]

    model_dir = Path(model_dir) / f"{symbol}_{interval}"
    model_path = model_dir / "model.pkl"
    meta_path = model_dir / "meta.json"

    if not model_path.exists():
        raise FileNotFoundError(f"Model not found: {model_path}")

    # Load meta.json để biết feature_columns
    with open(meta_path, "r") as f:
        meta = json.load(f)
    feature_columns = meta["feature_columns"]
    seq_len = meta.get("seq_len", 20)

    # Feature engineering
    X_last, df_feat = prepare_features_for_predict(df, feature_columns, seq_len)

    # Load model
    model = joblib.load(model_path)

    # Predict log_return
    pred_log_return = float(model.predict(X_last)[0])
    last_close = float(df_feat["close"].iloc[-1])
    y_pred = last_close * np.exp(pred_log_return)

    trend = "UP" if y_pred > last_close else "DOWN"
    change_pct = (y_pred - last_close) / last_close * 100


    return {
        "symbol": symbol,
        "interval": interval,
        "last_close": last_close,
        "predicted_next_close": y_pred,
        "trend": trend,
        "change_percent": change_pct
    }
