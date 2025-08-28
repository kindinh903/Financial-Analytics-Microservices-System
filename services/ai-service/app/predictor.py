# app/predictor.py
from typing import List, Optional, Dict, Any
import pandas as pd
from darts import TimeSeries
from darts.models import Prophet
from app.model_store import load_model
from app.sentiment_fng import merge_fng_to_ohlcv

class Predictor:
    def __init__(self):
        self._cache: Dict[str, Prophet] = {}  # symbol+interval -> model

    def _get_model(self, symbol: str, interval: str) -> Prophet:
        key = f"{symbol}_{interval}"
        if key in self._cache:
            return self._cache[key]
        model = load_model(symbol, interval)
        if model is None:
            raise ValueError(f"No model found for {symbol} {interval}")
        self._cache[key] = model
        return model

    def predict_from_candles(
        self, 
        symbol: str, 
        interval: str, 
        candles: List[Dict[str, Any]], 
        sentiment: Optional[Dict[str, float]] = None,
        steps: int = 1
    ) -> Dict[str, Any]:
        """
        candles: list of dict with keys ['datetime','open','high','low','close','volume']
        sentiment: dict with datetime -> sentiment (optional)
        steps: number of future steps to predict
        """
        if not candles:
            raise ValueError("candles list is empty")

        df = pd.DataFrame(candles)
        if 'datetime' not in df.columns:
            raise ValueError("candles must include 'datetime' field")
        df['datetime'] = pd.to_datetime(df['datetime'])
        df = df.sort_values('datetime').reset_index(drop=True)

        # merge sentiment if provided
        if sentiment:
            df['sentiment'] = df['datetime'].map(sentiment).fillna(0.0)

        ts = TimeSeries.from_dataframe(df, 'datetime', ['close'])
        cov = None
        if 'sentiment' in df.columns:
            cov = TimeSeries.from_dataframe(df, 'datetime', ['sentiment'])

        model = self._get_model(symbol, interval)

        # predict next `steps`
        if cov is not None:
            # future_covariates: take last covariate row repeated `steps` times
            last_cov = cov[-1:]
            future_cov = last_cov.stack(steps)
            forecast = model.predict(n=steps, future_covariates=future_cov)
        else:
            forecast = model.predict(n=steps)

        # return as dict
        forecast_df = forecast.pd_dataframe()
        result = {
            "symbol": symbol,
            "interval": interval,
            "predictions": forecast_df['close'].tolist(),
            "datetimes": forecast_df.index.tolist()
        }
        return result
