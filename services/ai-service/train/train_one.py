import pandas as pd
import joblib
from darts import TimeSeries
from darts.models import Prophet

from app.model_store import save_model

def train_one(symbol: str, interval: str, df: pd.DataFrame, model_name: str = 'prophet'):
    # expects df with 'datetime' (datetime-like), 'close' column; 'sentiment' optional
    df_local = df.copy()
    if 'datetime' not in df_local.columns:
        if 'close_time' in df_local.columns:
            df_local['datetime'] = pd.to_datetime(df_local['close_time'], unit='ms')
        else:
            raise ValueError("df must include 'datetime' or 'close_time'")
    df_local = df_local.sort_values('datetime').reset_index(drop=True)

    ts = TimeSeries.from_dataframe(df_local, 'datetime', ['close'])
    cov = None
    if 'sentiment' in df_local.columns:
        cov = TimeSeries.from_dataframe(df_local, 'datetime', ['sentiment'])

    model = Prophet()
    if cov is not None:
        model.fit(ts, future_covariates=cov)
    else:
        model.fit(ts)
    path = save_model(model, symbol, interval, model_name)
    print('saved', path)
    return path
