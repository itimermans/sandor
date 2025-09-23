"""Storage helpers for datasets for sandor_backend."""

from pathlib import Path
from typing import List

DATA_DIR = Path(__file__).resolve().parents[1] / "storage" / "datasets"


def list_datasets() -> List[str]:
    """Return dataset file stems in the storage directory."""
    if not DATA_DIR.exists():
        return []
    return [p.stem for p in DATA_DIR.iterdir() if p.is_file()]
