"""User-provided data sources for Sandor backend.

Drop your pandas DataFrames into the DATA dict below to make them available
to the frontend. Column names and counts are inferred directly from each
DataFrame—no hard-coded names needed. All columns should be numeric for now.

How it works:
- At app startup, the registry imports this module and looks for `DATA`.
- Each entry is registered as a dataset. Example: {"my_df": my_dataframe}
- The frontend discovers datasets via GET /meta/datasets and requests
  specific columns via POST /data/slice.

Notes:
- Prefer numeric dtypes (float64, int64) for plotting performance.
- Very large frames are okay; the server enforces a row window limit
  (env DATA_MAX_ROWS, default 200000) and sends Arrow/Parquet efficiently.
"""

from __future__ import annotations

from typing import Dict

import numpy as np
import pandas as pd

# Export your dataframes here. Keys are dataset IDs (strings), values are
# pandas.DataFrame.
# Example (uncomment to try):


# By default, no user datasets are registered. Add yours above.
DATA: Dict[str, pd.DataFrame] = {}


def _make_example(n: int = 10000) -> pd.DataFrame:
    rng = np.random.default_rng(42)
    return pd.DataFrame(
        {
            "time": np.arange(n, dtype=np.float64),
            "y0": rng.standard_normal(n).cumsum(),
            "y1": 1000 + rng.standard_normal(n).cumsum(),
        }
    )


# DATA["example1"] = _make_example(10000)
# DATA["example2"] = _make_example(20000)
# DATA["example3"] = _make_example(30000)
# DATA["example4"] = _make_example(15000)
# DATA["example5"] = _make_example(25000)
# DATA["example6"] = _make_example(35000)


DATA["manual1"] = pd.DataFrame(
    {"x": [1, 2, 3, 4, 5], "y": [10, 10, 10, 10, 10], "z": [5, 3, 6, 2, 7]}
)

DATA["manual2"] = pd.DataFrame(
    {"x": [1, 2, 3, 4, 5], "y": [20, 30, 40, 50, 60], "z": [5, 3, 6, 2, 7]}
)

DATA["manual3"] = pd.DataFrame(
    {"x": [1, 2, 3, 4, 5], "y": [-10, -10, -10, -10, -10], "z": [5, 3, 6, 2, 7]}
)
