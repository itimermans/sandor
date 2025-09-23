#!/bin/zsh
# Determine script directory (so script works when invoked from repo root or from inside backend/)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Activate the virtual environment if present (optional)
VENV_ACTIVATE="$SCRIPT_DIR/.venv/bin/activate"
if [ -f "$VENV_ACTIVATE" ]; then
	# shellcheck disable=SC1090
	source "$VENV_ACTIVATE"
fi

# Use the venv's python to avoid ambiguities and to ensure editable installs
PYTHON_EXEC="$SCRIPT_DIR/.venv/bin/python"
if [ ! -x "$PYTHON_EXEC" ]; then
	echo "Error: python not found at $PYTHON_EXEC. Create the venv first: (cd $SCRIPT_DIR && python -m venv .venv)"
	exit 1
fi

# Install sandor in editable mode with dev extras (explicit path to the backend folder)
"$PYTHON_EXEC" -m pip install -e "${SCRIPT_DIR}[dev]"

# Ensure FastAPI and Uvicorn are available for development/run
"$PYTHON_EXEC" -m pip install 'fastapi>=0.95' 'uvicorn[standard]>=0.22' 'python-multipart'


# Install local pinax in editable mode with dev extras (development mode)
# The repo layout has `Developer/pinax` next to `Developer/sandor`, so the
# pinax path from `backend/` is `../../pinax`.
PINAX_DIR="$SCRIPT_DIR/../../pinax"
if [ -d "$PINAX_DIR" ]; then
    # Install local pinax editable from the checked-out sibling repo
    "${PYTHON_EXEC}" -m pip install -e "${PINAX_DIR}[dev]"
else
	echo "Warning: ../../pinax not found. If you have pinax elsewhere, edit dev-install.sh to point to it."
fi

echo "Installed dev dependencies. Run the API with:"
echo "  uvicorn sandor_backend.api.app:app --reload --port 8000"