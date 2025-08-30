import torch
import torch.nn as nn
import joblib
import numpy as np
import pandas as pd
from typing import List, Union
from pathlib import Path
from app.data_utils import load_ohlcv_from_json
from app.data_utils import load_ohlcv_from_json, prepare_features
MODEL_DIR = Path("models")  # không thêm ./ để tránh bug khi chạy module




class MLPModel(nn.Module):
    def __init__(self, input_dim: int, hidden_dims: List[int] = [64, 64], output_dim: int = 1):
        super().__init__()
        layers = []
        prev_dim = input_dim
        for hdim in hidden_dims:
            layers.append(nn.Linear(prev_dim, hdim))
            layers.append(nn.ReLU())
            prev_dim = hdim
        layers.append(nn.Linear(prev_dim, output_dim))
        self.net = nn.Sequential(*layers)

    def forward(self, x):
        return self.net(x)


class Predictor:
    def __init__(self, symbol: str, interval: str, device: str = "cpu", hidden_dims: List[int] = [64, 64]):
        self.symbol = symbol
        self.interval = interval
        self.device = device
        self.hidden_dims = hidden_dims

        self.model_path = MODEL_DIR / f"model_{symbol}_{interval}.pth"
        self.scaler_path = MODEL_DIR / f"scaler_{symbol}_{interval}.pkl"

        self.model = None
        self.scaler = None

    def load(self, input_dim: int):
        # Load model
        self.model = MLPModel(input_dim, self.hidden_dims).to(self.device)
        state_dict = torch.load(self.model_path, map_location=self.device)
        self.model.load_state_dict(state_dict)
        self.model.eval()

        # Load scaler
        self.scaler = joblib.load(self.scaler_path)

    def _make_input(self, df: pd.DataFrame, seq_len=20) -> np.ndarray:
        """Tạo input giống lúc train (sequence close + volume + sentiment)."""
        df = df.reset_index(drop=True)
        close = df["close"].values
        vol = df.get("volume", pd.Series([0] * len(df))).values
        sent = df["sentiment"].values

        if len(df) < seq_len + 1:
            raise ValueError(f"Not enough data, need at least {seq_len+1} rows")

        # Lấy sequence cuối cùng
        i = len(df) - 1
        x_feat = np.hstack([
            close[i - seq_len:i],
            vol[i - seq_len:i],
            [sent[i]],
        ])
        return x_feat.astype(np.float32)

    def predict(self, json_data, seq_len=20) -> float:
        # Load OHLCV từ json hoặc df
        df_raw = load_ohlcv_from_json(json_data)

        # ✅ Thêm sentiment + technical features
        X, df = prepare_features(df_raw, add_sentiment=True)

        # Lấy input_dim = số feature (không nhân seq_len)
        input_dim = X.shape[1]

        # Lấy input cuối cùng (1 vector)

        # Lấy input_dim = số feature * seq_len
        # input_dim = X.shape[1] * seq_len

        # ✅ Load model + scaler nếu chưa có
        if self.model is None or self.scaler is None:
            self.load(input_dim)

        # Scale dữ liệu
        df_scaled = X.copy()
        df_scaled[["close", "volume", "return", "ma", "volatility", "sentiment"]] = \
            self.scaler.transform(df_scaled[["close", "volume", "return", "ma", "volatility", "sentiment"]])

        # Lấy input cuối
        # x_last = df_scaled.iloc[-seq_len:].to_numpy().flatten().astype(np.float32)
        x_last = df_scaled.iloc[-1].to_numpy().astype(np.float32)

        with torch.no_grad():
            X_tensor = torch.from_numpy(x_last).unsqueeze(0).to(self.device)
            y_pred_scaled = self.model(X_tensor).cpu().numpy().flatten()[0]

        # Inverse scale giá close
        y_pred = self.scaler.inverse_transform([[y_pred_scaled]])[0, 0]
        return float(y_pred)
