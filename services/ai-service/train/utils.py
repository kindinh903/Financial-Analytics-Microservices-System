# helpers used by training scripts (e.g., loading csv or querying Influx)
import os
import pandas as pd

def load_csv_history(path: str):
    if not os.path.exists(path):
        return None
    df = pd.read_csv(path)
    # expected columns: datetime (ISO) or close_time (ms), close, sentiment(optional)
    if 'close_time' in df.columns:
        df['datetime'] = pd.to_datetime(df['close_time'], unit='ms')
    elif 'datetime' in df.columns:
        df['datetime'] = pd.to_datetime(df['datetime'])
    else:
        raise ValueError("CSV must include 'datetime' or 'close_time'")
    return df
