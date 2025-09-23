"""Service layer for data operations for sandor_backend."""

import shutil
import tempfile
import uuid
from pathlib import Path

import pandas as pd
from fastapi import UploadFile

# Simple storage path inside backend for development; replace with S3/GCS
# in production.
STORAGE_DIR = Path(__file__).resolve().parents[2] / "storage" / "datasets"
STORAGE_DIR.mkdir(parents=True, exist_ok=True)


async def handle_upload(upload: UploadFile) -> str:
    """Handle a file upload and persist it in an efficient columnar format.

    See the original implementation in the scaffold for details and caveats.
    """

    suffix = Path(upload.filename).suffix or ""
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
            shutil.copy(tmp.name, out_path.with_suffix(Path(upload.filename).suffix))

        return dataset_id
    finally:
        try:
            Path(tmp.name).unlink()
        except Exception:
            pass
