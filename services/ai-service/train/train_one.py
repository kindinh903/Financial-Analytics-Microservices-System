# train_one_improved.py
import os
from pathlib import Path
import joblib
import json
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, mean_absolute_error
import warnings

MODEL_DIR = Path("./models")
MODEL_DIR.mkdir(parents=True, exist_ok=True)
interval_map = {
    "1m": "1m",
    "3m": "3m",
    "5m": "5m",
    "15m": "15m",
    "30m": "30m",
    "1h": "1h",
    "2h": "2h",
    "4h": "4h",
    "6h": "6h",
    "8h": "8h",
    "12h": "12h",
    "1d": "1d",
    "3d": "3d",
    "1w": "1w",
    "1M": "1mon"   # 👈 đổi month thành "1mon"
}

# Try to import LightGBM, fallback to XGBoost, then RandomForest
try:
    import lightgbm as lgb
    MODEL_BACKEND = "lightgbm"
except Exception:
    try:
        import xgboost as xgb
        MODEL_BACKEND = "xgboost"
    except Exception:
        from sklearn.ensemble import RandomForestRegressor
        MODEL_BACKEND = "sklearn_rf"

warnings.filterwarnings("ignore")


def ensure_datetime(df):
    # đảm bảo có cột datetime (tên phổ biến: 'timestamp','open_time','date','time')
    dt_cols = [c for c in df.columns if "time" in c.lower() or "date" in c.lower()]
    if len(dt_cols) > 0:
        df['_dt'] = pd.to_datetime(df[dt_cols[0]], unit='ms', errors='ignore')
    else:
        # nếu không có, tạo theo index nếu index là datetime
        if isinstance(df.index, pd.DatetimeIndex):
            df['_dt'] = df.index
        else:
            df['_dt'] = pd.to_datetime(df.index, errors='coerce')
    df = df.sort_values('_dt').reset_index(drop=True)
    return df


def compute_technical_indicators(df):
    """Tạo các feature kỹ thuật cơ bản: EMA, MA, RSI, MACD, Bollinger, volatility, v.v."""
    close = df["close"].astype(float)

    # EMAs
    for span in (5, 10, 21, 50):
        df[f"ema_{span}"] = close.ewm(span=span, adjust=False).mean()

    # Simple moving averages
    for w in (3, 7, 14, 30):
        df[f"ma_{w}"] = close.rolling(window=w, min_periods=1).mean()

    # Rolling std (volatility)
    for w in (3, 7, 14, 30):
        df[f"std_{w}"] = close.rolling(window=w, min_periods=1).std().fillna(0)

    # Bollinger bands (20)
    ma20 = close.rolling(20, min_periods=1).mean()
    std20 = close.rolling(20, min_periods=1).std().fillna(0)
    df["bb_upper"] = ma20 + 2 * std20
    df["bb_lower"] = ma20 - 2 * std20
    df["bb_width"] = (df["bb_upper"] - df["bb_lower"]) / (ma20.replace(0, np.nan)).fillna(0)

    # MACD
    ema12 = close.ewm(span=12, adjust=False).mean()
    ema26 = close.ewm(span=26, adjust=False).mean()
    df["macd"] = ema12 - ema26
    df["macd_signal"] = df["macd"].ewm(span=9, adjust=False).mean()
    df["macd_diff"] = df["macd"] - df["macd_signal"]

    # RSI (14)
    delta = close.diff()
    up = delta.clip(lower=0)
    down = -1 * delta.clip(upper=0)
    roll_up = up.rolling(window=14, min_periods=1).mean()
    roll_down = down.rolling(window=14, min_periods=1).mean().replace(0, 1e-8)
    rs = roll_up / roll_down
    df["rsi_14"] = 100 - (100 / (1 + rs))

    # Volume features
    if "volume" in df.columns:
        df["vol_1"] = df["volume"].shift(1)
        df["vol_mean_7"] = df["volume"].rolling(7, min_periods=1).mean()
        df["vol_change_1"] = df["volume"].pct_change().fillna(0)

    # Time features
    if "_dt" in df.columns:
        df["hour"] = df["_dt"].dt.hour
        df["dayofweek"] = df["_dt"].dt.dayofweek
        df["month"] = df["_dt"].dt.month
        df["is_weekend"] = df["dayofweek"].isin([5, 6]).astype(int)

    return df


def create_lag_features(df, seq_len=20, use_close_lags=True):
    """
    Tạo các lag của log returns (lag_lr_1...lag_lr_seq_len)
    và (nếu cần) lag giá close / volume (scale-sensitive).
    """
    # log close & log return
    df["log_close"] = np.log(df["close"].astype(float))
    df["log_return"] = df["log_close"] - df["log_close"].shift(1)

    # lags of log_return (scale-invariant)
    for lag in range(1, seq_len + 1):
        df[f"lag_lr_{lag}"] = df["log_return"].shift(lag)

    # optionally raw close lags (might be useful)
    if use_close_lags:
        for lag in (1, 2, 3, 5, 10):
            df[f"lag_close_{lag}"] = df["close"].shift(lag)

    # lag sentiment (if any)
    if "sentiment" in df.columns:
        df["sentiment_lag_1"] = df["sentiment"].shift(1)
        df["sentiment_lag_2"] = df["sentiment"].shift(2)

    return df


def prepare_features_and_target(df: pd.DataFrame, seq_len=20):
    """
    Tạo toàn bộ feature matrix X và target y.
    Target = log_return_next = log(close_next) - log(close) (scale invariant)
    """
    df = ensure_datetime(df)
    if "sentiment" not in df.columns:
        df["sentiment"] = 0.0

    df = compute_technical_indicators(df)
    df = create_lag_features(df, seq_len=seq_len, use_close_lags=True)

    # Clean extreme values
    df = df.replace([np.inf, -np.inf], np.nan)
    df = df.fillna(0)   # hoặc df.dropna() nếu muốn bỏ hàng lỗi

    # Optionally, clip toàn bộ feature về [-1e6, 1e6] để tránh float32 overflow
    for col in df.columns:
        if df[col].dtype.kind in "fc":  # float or complex
            df[col] = df[col].clip(-1e6, 1e6)
            
    # target = next log return
    df["target"] = df["log_close"].shift(-1) - df["log_close"]

    # drop rows with NaN in features/target
    # choose columns used for features
    # We'll take: all lag_lr_*, lag_close_*, technicals, volume features, time features, sentiment_*
    feature_cols = [c for c in df.columns if (
        c.startswith("lag_lr_") or c.startswith("lag_close_")
        or c.startswith("ema_") or c.startswith("ma_") or c.startswith("std_")
        or c in ("bb_upper", "bb_lower", "bb_width", "macd", "macd_signal", "macd_diff", "rsi_14")
        or c.startswith("vol_") or c in ("hour", "dayofweek", "month", "is_weekend")
        or c.startswith("sentiment")
    )]

    df_feat = df[feature_cols + ["target"]].dropna().reset_index(drop=True)
    X = df_feat[feature_cols].astype(float).values
    y = df_feat["target"].astype(float).values

    # We'll also keep the corresponding timestamps and last_close for later inverse transform
    timestamps = df.loc[df_feat.index, "_dt"].reset_index(drop=True)
    last_close_for_row = df.loc[df_feat.index, "close"].reset_index(drop=True)

    return X, y, feature_cols, timestamps, last_close_for_row


def train_one(symbol: str, interval: str, df: pd.DataFrame, seq_len=20,
              test_size_ratio=0.1, val_size_ratio=0.1, random_state=42,
              n_estimators=1000, learning_rate=0.05):
    """
    Train model cho 1 symbol-interval. Lưu file model và metadata để dùng khi predict.
    Trả về đường dẫn model và metrics.
    """
    # prepare data
    X, y, feature_cols, timestamps, last_close = prepare_features_and_target(df.copy(), seq_len=seq_len)
    if len(X) < 200:
        print(f"[{symbol}-{interval}] Warning: too few rows after feature creation: {len(X)}. Consider fetching more history.")
    # time-based split: train / val / test (by index)
    n = len(X)
    test_n = max(1, int(n * test_size_ratio))
    val_n = max(1, int(n * val_size_ratio))

    X_train = X[: n - val_n - test_n]
    y_train = y[: n - val_n - test_n]
    X_val = X[n - val_n - test_n: n - test_n]
    y_val = y[n - val_n - test_n: n - test_n]
    X_test = X[n - test_n:]
    y_test = y[n - test_n:]

    print(f"[{symbol}-{interval}] Samples: total={n}, train={len(X_train)}, val={len(X_val)}, test={len(X_test)}")
    model_metadata = {
        "symbol": symbol,
        "interval": interval,
        "feature_columns": feature_cols,
        "seq_len": seq_len,
        "target_mode": "log_return",
        "backend": MODEL_BACKEND
    }

    # choose model backend
    if MODEL_BACKEND == "lightgbm":
        model = lgb.LGBMRegressor(
            n_estimators=5000,
            learning_rate=0.01,
            max_depth=-1,
            subsample=0.8,
            colsample_bytree=0.8,
            random_state=42,
            n_jobs=-1
        )

        model.fit(
            X_train, y_train,
            eval_set=[(X_val, y_val)],
            callbacks=[lgb.early_stopping(stopping_rounds=50)],  # ✅ dùng callbacks
        )

    elif MODEL_BACKEND == "xgboost":
        model = xgb.XGBRegressor(objective="reg:squarederror", n_estimators=n_estimators,
                                 learning_rate=learning_rate, n_jobs=-1)
        model.fit(X_train, y_train, eval_set=[(X_val, y_val)], early_stopping_rounds=50, verbose=50)
    else:
        # fallback RandomForest (slower + less tuned)
        model = RandomForestRegressor(n_estimators=200, n_jobs=-1, random_state=random_state)
        model.fit(X_train, y_train)

    # evaluate
    def inv_transform_logreturn_to_price(last_close_scalar, pred_log_return):
        return last_close_scalar * np.exp(pred_log_return)

    y_pred_test_lr = model.predict(X_test)
    # convert to price for intuitive metrics
    last_closes_test = last_close.values[-len(y_test):].astype(float) if hasattr(last_close, "values") else np.array(last_close[-len(y_test):], dtype=float)
    y_test_prices = last_closes_test * np.exp(y_test)
    y_pred_prices = last_closes_test * np.exp(y_pred_test_lr)

    rmse = mean_squared_error(y_test_prices, y_pred_prices)
    mae = mean_absolute_error(y_test_prices, y_pred_prices)
    print(f"[{symbol}-{interval}] Test RMSE (price) = {rmse:.6f}, MAE = {mae:.6f}")

    # Save model + metadata
    # out_dir = MODEL_DIR / f"{symbol}_{interval}"
    interval_safe = interval_map.get(interval, interval)
    out_dir = MODEL_DIR / f"{symbol}_{interval_safe}"

    out_dir.mkdir(parents=True, exist_ok=True)
    model_path = out_dir / "model.pkl"
    meta_path = out_dir / "meta.json"

    joblib.dump(model, model_path)
    with open(meta_path, "w") as f:
        json.dump(model_metadata, f, indent=2, default=str)

    print(f"✅ Saved model to {model_path} and metadata to {meta_path}")

    return {
        "model_path": str(model_path),
        "meta_path": str(meta_path),
        "test_metrics": {"rmse_price": float(rmse), "mae_price": float(mae)}
    }


def predict_next_close(symbol: str, interval: str, recent_df: pd.DataFrame,
                       model_dir=MODEL_DIR):
    """
    recent_df: phải chứa đủ history để tạo feature (>= seq_len + 30 recommended),
               cột bắt buộc: 'close', optional 'volume', 'sentiment', và timestamp column.

    Trả về: dict {predicted_close, predicted_log_return, model_meta}
    """
    out_dir = model_dir / f"{symbol}_{interval}"
    model_path = out_dir / "model.pkl"
    meta_path = out_dir / "meta.json"
    if not model_path.exists() or not meta_path.exists():
        raise FileNotFoundError(f"Model or meta not found for {symbol}-{interval} at {out_dir}")

    model = joblib.load(model_path)
    with open(meta_path, "r") as f:
        meta = json.load(f)

    seq_len = meta.get("seq_len", 20)
    feature_cols = meta["feature_columns"]

    # Prepare features on recent_df (same pipeline)
    df_local = recent_df.copy()
    df_local = ensure_datetime(df_local)
    if "sentiment" not in df_local.columns:
        df_local["sentiment"] = 0.0
    df_local = compute_technical_indicators(df_local)
    df_local = create_lag_features(df_local, seq_len=seq_len, use_close_lags=True)

    # take last row that has no NaNs in feature_cols
    candidate = df_local[feature_cols].tail(1)
    if candidate.isnull().any(axis=None):
        # try to drop rows with NaN and use last available row
        candidate = df_local[feature_cols].dropna().tail(1)
        if len(candidate) == 0:
            raise ValueError("Not enough history or features contain NaN. Provide more candles.")

    X_pred = candidate.values.astype(float)
    pred_log_return = float(model.predict(X_pred)[0])

    last_close = float(df_local["close"].dropna().iloc[-1])
    predicted_close = last_close * np.exp(pred_log_return)

    return {
        "predicted_close": float(predicted_close),
        "predicted_log_return": float(pred_log_return),
        "last_close": float(last_close),
        "meta": meta
    }
