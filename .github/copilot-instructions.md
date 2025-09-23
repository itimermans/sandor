# Copilot Instructions for sandor

## Overview
Sandor is a Data Analysis package that provides visualization, analysis and export tools for tabular format from different sources. 

## Structure instructions
- This package will use a src layout
- This package should be installable via pip, but should also provide compatibility for future usage of Poetry or uv. Therefore, the pyproject.toml file should be standard PEP 621 compliant.
- If possible, there should also be an environment.yml file for conda users.
- Assume that if installing from this package, it will be done for development purposes
- This repo will use pinax, which is in github (git@github.com:itimermans/pinax.git), but for development, it will be installed as editable from its development folder 

## Backend general instructions

- Use FastAPI as the main backend framework (async, OpenAPI support, high-throughput).
- Keep API layer (routing, auth, request handling) separate from compute layer (heavy data processing).
- Consider Ray or Dask for distributed / parallel processing of very large datasets. Explicitly ask before implementing 
- Implement heavy operations as async tasks or background jobs (Celery, Ray tasks) to prevent blocking. Explicitly ask before implementing 
- Use columnar formats (Apache Arrow, Parquet) for internal data handling efficiency.
- Apply lazy evaluation and chunked reads to manage gigabyte-scale datasets without memory blowup. Explicitly ask before implementing 
- Add caching for expensive or repeat computations. Explicitly ask before implementing
- Adopt a modular structure: API, services, models, storage.
- Enforce strong typing (e.g., Pydantic) for request and response schemas.
- Maintain logging and monitoring for long-running jobs and performance metrics.
- In the future, we'll use containers (Docker + conda/uv environments) for reproducible builds. For now we'll use venv
- Explicitly separate pinax and other low-level utilities from high-level backend logic.
