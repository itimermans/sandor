# sandor backend (scaffold)

This folder contains a minimal FastAPI backend scaffold following the
project's backend guidelines. The scaffold intentionally favors clarity and
best-practice separation of concerns (API vs services vs storage).

What is included
- `environment.yml` — optional conda environment (Python 3.12) for dev.
- `dev-install.sh` — installs editable package and dev dependencies; updated
  to ensure FastAPI and Uvicorn are available.
- `src/sandor` — backend package
  - `api/` — FastAPI app factory and routers (`health`, `data`)
  - `services/` — compute/service layer (example `data_service`)
  - `models/` — Pydantic schemas for request/response
  - `storage/` — minimal storage helpers and patterns
  - `logging.py` — centralized logging configuration

How to run (development)
1. From `backend/`, create and activate a virtualenv, then run `dev-install.sh`:

```bash
# On macOS use python3 to create the venv (system python may point to 2.x or
# an older interpreter). After activation, `python` will point to the venv
# interpreter and can be used normally.
python3 -m venv .venv
source .venv/bin/activate
./dev-install.sh
```

2. Run the app with Uvicorn (reload enabled for dev):

```bash
uvicorn sandor.api.app:app --reload --port 8000
```

3. Health endpoint: `GET http://localhost:8000/health/`

Design notes and next steps
- Separation of concerns: keep heavy data processing in `services` and raw
  IO in `storage` so you can replace disk-based storage with object storage
  easily.
- For very large datasets, replace the simple pandas-to-parquet conversion
  with pyarrow's streaming ParquetWriter or a Dask/Ray pipeline. Ask before
  adding distributed frameworks.
- Add authentication, rate limiting, and structured logging when moving to
  production.

If you want, I can now:
- Add unit tests for the small components I created.
- Replace the naive Parquet append logic with a streaming writer using
  pyarrow (recommended for large datasets).
- Add background job support (Celery / Redis) for heavy imports — I'll ask
  before adding that.
# sandor

Data analysis app

## Features


## Installation (Regular Users)

Installing from source:

```zsh
git clone https://github.com/itimermans/sandor.git
cd sandor
pip install .
```

## Installation (Development)

To set up sandor for development with a local editable install of pinax:

1. Clone both repositories side by side:
	```zsh
	git clone https://github.com/itimermans/pinax.git
	git clone https://github.com/itimermans/sandor.git
	```

2. Create and activate a virtual environment:
	```zsh
	cd sandor
  # Use python3 to create the venv on macOS
  python3 -m venv .venv
	source .venv/bin/activate
	```

3. Run the development install script:
	```zsh
	source dev-install.sh
	```

This will install both sandor and pinax in editable mode, with all development dependencies. The local pinax will override any remote version specified in pyproject.toml for the current environment.

**Note:** `dev-install.sh` expects the `pinax` repository to be located at `../../pinax` relative to the `backend/` folder (i.e. `Developer/pinax` next to `Developer/sandor`). If your `pinax` clone is elsewhere, update the path in `dev-install.sh`.

**Note:** Always run the dev-install.sh script after other pip installs to ensure the local editable pinax is used.

## Usage

Import sandor in your Python code:
```python
import sandor
# ... use sandor's features ...
```

## License
See the LICENSE file for details.