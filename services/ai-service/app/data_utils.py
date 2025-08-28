import pandas as pd
import numpy as np
from typing import Optional

TECH_FEATURES = [
    # baseline features; extend later
    'close', 'volume', 'ret', 'ma5','ma10','rsi14'
]

def candles_to_df(candles: list) -> pd.DataFrame:
    # candles: list of dicts or pydantic models
    raw = []
    for c in candles:
        if hasattr(c, '__dict__'):
            raw.append(c.__dict__)
        elif isinstance(c, dict):
            raw.append(c)
        else:
            # pydantic BaseModel .dict()
            try:
                raw.append(c.dict())
            except:
                raise ValueError("Unsupported candle type")
    df = pd.DataFrame(raw)
    if 'close_time' not in df.columns:
        raise ValueError("candles must include close_time")
    df = df.sort_values('close_time').reset_index(drop=True)
    return df

def add_basic_features(df: pd.DataFrame, sentiment: Optional[dict] = None):
    df = df.copy()
    df['ret'] = np.log(df['close']).diff().fillna(0.0)
    df['ma5'] = df['close'].rolling(5).mean().ffill().fillna(df['close'])
    df['ma10'] = df['close'].rolling(10).mean().ffill().fillna(df['close'])

    # RSI 14
    change = df['close'].diff()
    up = change.clip(lower=0).rolling(14).mean()
    down = -change.clip(upper=0).rolling(14).mean()
    rs = up / (down + 1e-9)
    df['rsi14'] = 100 - (100 / (1 + rs))
    df['rsi14'] = df['rsi14'].fillna(50)

    if sentiment is not None:
        sdict = sentiment.dict() if hasattr(sentiment, "dict") else sentiment
        df['sentiment'] = float(sdict.get('fng') or 0.0)  # chỉ giữ 1 cột duy nhất
    else:
        df['sentiment'] = 0.0



    return df
