import json
import joblib
import pandas as pd
import numpy as np
from pathlib import Path
from train.train_one import ensure_datetime, compute_technical_indicators, create_lag_features

def prepare_features_for_predict(df: pd.DataFrame, feature_columns: list, seq_len: int = 20):
    df = ensure_datetime(df)

    # sentiment mặc định 0 nếu không có
    if "sentiment" not in df.columns:
        df["sentiment"] = 0.0

    # sentiment features (giống train)
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



def predict_next_close(json_path: str, model_dir: str = "models"):
    # Load data
    df = load_json_ohlcv(json_path)

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

    # Feature engineering giống train
    X_last, df_feat = prepare_features_for_predict(df, feature_columns, seq_len)

    # Load model
    model = joblib.load(model_path)

    # Predict log_return
    pred_log_return = float(model.predict(X_last)[0])
    last_close = float(df_feat["close"].iloc[-1])
    y_pred = last_close * np.exp(pred_log_return)

    print(f"Symbol: {symbol}, Interval: {interval}")
    print(f"Last close = {last_close:.4f}")
    print(f"Predicted next close = {y_pred:.4f}")

    return y_pred


def load_json_ohlcv(path: str) -> pd.DataFrame:
    with open(path, "r") as f:
        raw = json.load(f)

    rows = raw["data"]
    df = pd.DataFrame(rows)
    # chuyển timestamp về datetime
    df["datetime"] = pd.to_datetime(df["close_time"], unit="ms")
    return df

# def predict_next_close(json_path: str, model_dir: str = "models"):
#     # Load data
#     df = load_json_ohlcv(json_path)

#     symbol = df["symbol"].iloc[0]
#     interval = df["interval"].iloc[0]

#     model_dir = Path(model_dir) / f"{symbol}_{interval}"
#     model_path = model_dir / "model.pkl"
#     meta_path = model_dir / "meta.json"

#     if not model_path.exists():
#         raise FileNotFoundError(f"Model not found: {model_path}")

#     # Load meta.json để biết feature_columns
#     with open(meta_path, "r") as f:
#         meta = json.load(f)
#     feature_columns = meta["feature_columns"]

#     # Feature engineering (cần bổ sung đầy đủ giống khi train!)
#     df_feat = add_features(df)

#     # Đảm bảo chọn đúng thứ tự cột
#     X_last = df_feat[feature_columns].iloc[-1:].fillna(0)

#     # Load model
#     model = joblib.load(model_path)

#     # Predict
#     y_pred = model.predict(X_last)[0]
#     last_close = df_feat["close"].iloc[-1]

#     print(f"Symbol: {symbol}, Interval: {interval}")
#     print(f"Last close = {last_close:.4f}")
#     print(f"Predicted next close = {y_pred:.4f}")

#     return y_pred

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--json", type=str, required=True, help="sample.json")
    parser.add_argument("--model-dir", type=str, default="models", help="Directory of trained models")
    args = parser.parse_args()

    predict_next_close(args.json, args.model_dir)
