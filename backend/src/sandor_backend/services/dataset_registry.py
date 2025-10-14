"""In-memory dataset registry with user-pluggable data sources.

Defaults to small demo frames if no user data is provided.
Users can optionally provide a module `sandor_backend.storage.user_data` with a
global dict `DATA` mapping dataset_id -> pandas.DataFrame (numeric columns).
"""

from __future__ import annotations

from typing import Dict, List, Optional, Tuple

import numpy as np
import pandas as pd
import pyarrow as pa

_REGISTRY: Dict[str, pd.DataFrame] = {}


def _brownian(n: int) -> np.ndarray:
    steps = np.random.standard_normal(n)
    return np.cumsum(steps)


def _make_df(n: int) -> pd.DataFrame:
    df = pd.DataFrame(
        {
            "Time": np.arange(1, n + 1, dtype=np.int64),
            "A": _brownian(n),
            "B": _brownian(n),
            "C": _brownian(n),
            "D": _brownian(n),
            "E": _brownian(n),
        }
    )
    return df


def init(n_rows: int = 10_000) -> None:
    """Initialize registry from user-provided DATA or fallback to demo.

    - Try to import sandor_backend.storage.user_data.DATA
    - If available and non-empty, register those DataFrames
    - Else, generate two demo datasets with generic names
    """
    global _REGISTRY
    if _REGISTRY:
        return
    try:
        from sandor_backend.storage import user_data  # type: ignore

        DATA = getattr(user_data, "DATA", None)
        if isinstance(DATA, dict) and DATA:
            for k, v in DATA.items():
                if isinstance(v, pd.DataFrame):
                    _REGISTRY[k] = v
    except Exception:
        # Ignore missing or invalid user_data, fallback to demo below
        pass

    if not _REGISTRY:
        _REGISTRY["sample_1"] = _make_df(n_rows)
        _REGISTRY["sample_2"] = _make_df(n_rows)


def list_datasets() -> List[dict]:
    return [{"dataset_id": k, "columns": list(v.columns)} for k, v in _REGISTRY.items()]


def get_table(
    dataset_id: str,
    columns: Optional[List[str]] = None,
    row_range: Optional[Tuple[int, int]] = None,
) -> pa.Table:
    if dataset_id not in _REGISTRY:
        raise KeyError("dataset not found")
    df = _REGISTRY[dataset_id]
    if columns:
        df = df[columns]
    if row_range:
        start, end = row_range
        df = df.iloc[start:end]
    return pa.Table.from_pandas(df, preserve_index=False)
