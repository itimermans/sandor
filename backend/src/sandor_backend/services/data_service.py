"""Service layer for data operations for sandor_backend."""

import io
import shutil
import tempfile
import uuid
from pathlib import Path
from typing import AsyncIterator, List, Optional, Tuple

import pandas as pd
import pyarrow.ipc as pa_ipc
import pyarrow.parquet as pq
from fastapi import UploadFile
from sandor_backend.services import dataset_registry

# Simple storage path inside backend for development; replace with S3/GCS
# in production.
STORAGE_DIR = Path(__file__).resolve().parents[2] / "storage" / "datasets"
STORAGE_DIR.mkdir(parents=True, exist_ok=True)
HANDLES_DIR = STORAGE_DIR / "handles"
HANDLES_DIR.mkdir(parents=True, exist_ok=True)


async def handle_upload(upload: UploadFile) -> str:
    """Handle a file upload and persist it in an efficient columnar format.

    See the original implementation in the scaffold for details and caveats.
    """

    filename = upload.filename or ""
    suffix = Path(filename).suffix if filename else ""
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    try:
        while True:
            chunk = await upload.read(1024 * 1024)
            if not chunk:
                break
            tmp.write(chunk)
        tmp.flush()
        tmp.close()

        dataset_id = str(uuid.uuid4())
        out_path = STORAGE_DIR / f"{dataset_id}.parquet"

        if suffix.lower() in {".csv", ".txt"}:
            chunks = pd.read_csv(tmp.name, chunksize=100_000)
            first = True
            for chunk in chunks:
                if first:
                    chunk.to_parquet(out_path, engine="pyarrow", index=False)
                    first = False
                else:
                    existing = pd.read_parquet(out_path)
                    combined = pd.concat([existing, chunk], ignore_index=True)
                    combined.to_parquet(out_path, engine="pyarrow", index=False)
        else:
            shutil.copy(tmp.name, out_path.with_suffix(suffix))

        return dataset_id
    finally:
        try:
            Path(tmp.name).unlink()
        except Exception:
            pass


async def slice_to_parquet(desc) -> str:
    """Create a Parquet file for the requested slice and return its path.

    NOTE: This is a simplified placeholder that loads a full dataset parquet,
    then selects columns/row range. Real impl should push down filters and windowing.
    """
    table = _resolve_table(desc.dataset_id, desc.columns, desc.row_range)
    # enforce windowing
    import os as _os

    max_rows = int(_os.environ.get("DATA_MAX_ROWS", "200000"))
    if desc.row_range:
        start, end = desc.row_range
        end = min(end, start + max_rows)
        table = table.slice(start, max(0, (end - start)))
    else:
        table = table.slice(0, min(max_rows, table.num_rows))
    out_path = HANDLES_DIR / f"{desc.dataset_id}-{uuid.uuid4().hex}.parquet"
    pq.write_table(table, out_path)
    return str(out_path)


async def slice_to_arrow_stream(desc) -> AsyncIterator[bytes]:
    """Yield an Arrow IPC stream for the requested slice."""
    table = _resolve_table(desc.dataset_id, desc.columns, desc.row_range)

    sink = io.BytesIO()
    with pa_ipc.new_stream(sink, table.schema) as writer:
        writer.write_table(table)
    sink.seek(0)

    chunk = sink.read(64 * 1024)
    while chunk:
        yield chunk
        chunk = sink.read(64 * 1024)


async def fetch_arrow_stream(handle: str) -> AsyncIterator[bytes]:
    """Return an Arrow stream for a previously prepared handle.

    Placeholder: derive filename convention from handle mapping file.
    """
    # For demo, try to locate a parquet file and convert to stream
    parquet_path = await fetch_parquet_path(handle)
    table = pq.read_table(parquet_path)
    sink = io.BytesIO()
    with pa_ipc.new_stream(sink, table.schema) as writer:
        writer.write_table(table)
    sink.seek(0)
    chunk = sink.read(64 * 1024)
    while chunk:
        yield chunk
        chunk = sink.read(64 * 1024)


async def fetch_parquet_path(handle: str) -> str:
    """Resolve a handle to a parquet path.

    Placeholder: look for any parquet in HANDLES_DIR with prefix.
    """
    # In real impl, store mapping in a KV store; here scan directory
    for p in HANDLES_DIR.glob("*.parquet"):
        # naive return newest
        return str(p)
    raise FileNotFoundError("handle not found")


def _resolve_table(
    dataset_id: str,
    columns: Optional[List[str]] = None,
    row_range: Optional[Tuple[int, int]] = None,
):
    """Resolve a pyarrow.Table for a dataset from storage or in-memory registry.

    - If a parquet file exists for the dataset_id, read from disk (subset columns).
    - Else, if dataset exists in dataset_registry, build from in-memory pandas.
    - Enforce DATA_MAX_ROWS windowing and row_range slicing.
    """
    # Try on-disk parquet first
    ds_path = STORAGE_DIR / f"{dataset_id}.parquet"
    if ds_path.exists():
        table = pq.read_table(ds_path, columns=columns if columns else None)
    else:
        # Try in-memory demo datasets
        table = dataset_registry.get_table(dataset_id, columns=columns, row_range=None)

    import os as _os3

    max_rows = int(_os3.environ.get("DATA_MAX_ROWS", "200000"))
    if row_range:
        start, end = row_range
        end = min(end, start + max_rows)
        table = table.slice(start, max(0, (end - start)))
    else:
        table = table.slice(0, min(max_rows, table.num_rows))
    return table
