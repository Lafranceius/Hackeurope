from typing import Any, Dict, Tuple

import pandas as pd


def normalize_headers(df: pd.DataFrame) -> Tuple[pd.DataFrame, Dict[str, Any]]:
    original_cols = list(df.columns)
    df.columns = [str(c).strip().lower().replace(" ", "_") for c in df.columns]
    return df, {
        "action": "normalize_headers",
        "details": f"Renamed columns from {original_cols} to {list(df.columns)}",
    }


def normalize_values(df: pd.DataFrame) -> Tuple[pd.DataFrame, Dict[str, Any]]:
    for col in df.select_dtypes(include=["object", "string"]).columns:
        df[col] = df[col].apply(lambda x: x.strip() if isinstance(x, str) else x)
    return df, {
        "action": "normalize_values",
        "details": "Stripped whitespace from string columns",
    }
