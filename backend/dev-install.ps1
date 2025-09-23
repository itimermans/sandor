<#
Windows PowerShell version of dev-install.sh
Usage: Open PowerShell in the repo root and run: `./backend/dev-install.ps1`
#>

Set-StrictMode -Version Latest

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition

# Path to venv activation and python
$VenvActivate = Join-Path $ScriptDir ".venv\Scripts\Activate.ps1"
$PythonExec = Join-Path $ScriptDir ".venv\Scripts\python.exe"

if (Test-Path $VenvActivate) {
    try {
        # Try to dot-source Activate.ps1 to activate the venv for the session
        . $VenvActivate
    } catch {
        Write-Host "Warning: could not run Activate.ps1: $_" -ForegroundColor Yellow
    }
}

if (-not (Test-Path $PythonExec)) {
    Write-Host "Error: python not found at $PythonExec. Create the venv first:" -ForegroundColor Red
    Write-Host "  cd $ScriptDir; python -m venv .venv" -ForegroundColor Cyan
    exit 1
}

# Use the venv's python to install editable package and dev extras
& $PythonExec -m pip install -e "${ScriptDir}[dev]"

# Runtime dependencies are declared in `pyproject.toml`.
# Installing the project in editable mode with extras will install them:
# & $PythonExec -m pip install -e "${ScriptDir}[dev]"

# Install local pinax in editable mode if sibling repo exists (../../pinax)
$PinaxDirCandidate = Join-Path $ScriptDir "..\..\pinax"
$PinaxFull = Resolve-Path -Path $PinaxDirCandidate -ErrorAction SilentlyContinue
if ($PinaxFull) {
    & $PythonExec -m pip install -e "$($PinaxFull.Path)[dev]"
} else {
    Write-Host "Warning: ../../pinax not found. If you have pinax elsewhere, edit dev-install.ps1 to point to it." -ForegroundColor Yellow
}

Write-Host "Installed dev dependencies. Run the API with:" -ForegroundColor Green
Write-Host "  uvicorn sandor_backend.api.app:app --reload --port 8000" -ForegroundColor Cyan
