
import numpy as np
import pandas as pd
from pathlib import Path
from app.sentiment_fng import get_fng, merge_fng_to_ohlcv
from app.model_utils import load_model
from app.config import settings


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
     # Clean extreme values
    df = df.replace([np.inf, -np.inf], np.nan)
    df = df.fillna(0)   # hoặc df.dropna() nếu muốn bỏ hàng lỗi

    # Optionally, clip toàn bộ feature về [-1e6, 1e6] để tránh float32 overflow
    for col in df.columns:
        if df[col].dtype.kind in "fc":  # float or complex
            df[col] = df[col].clip(-1e6, 1e6)

    # lấy hàng cuối cùng không NaN
    candidate = df[feature_columns].dropna().tail(1)
    if len(candidate) == 0:
        raise ValueError("Không đủ dữ liệu để tạo features, cần thêm nhiều nến hơn")

    return candidate, df


def predict_next_close(df: pd.DataFrame, model_dir: str = "models") -> dict:
    symbol = df["symbol"].iloc[0]
    interval = df["interval"].iloc[0]

    fng_df = get_fng(limit=365)
    df = merge_fng_to_ohlcv(df, fng_df)
    interval_safe = settings.interval_map.get(interval, interval)


    # model_path =Path(model_dir) / f"{symbol}_{interval_safe}/model.pkl"
    # if not model_path.exists():
    #     raise FileNotFoundError(f"Model not found: {model_path}")

    # Load model,meta.json để biết feature_columns
    model, meta = load_model(symbol, interval_safe, model_dir=model_dir)


    feature_columns = meta["feature_columns"]
    seq_len = meta.get("seq_len", 20)

    # Feature engineering
    X_last, df_feat = prepare_features_for_predict(df, feature_columns, seq_len)



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
