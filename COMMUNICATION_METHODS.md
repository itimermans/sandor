# Sandor Communication Methods

This document describes the communication methods and protocols used for each major feature in the Sandor data analysis system. Use this as a reference for backend/frontend integration and future extensibility.

## Control-plane (Metadata, Features, Requests)
- **Transport:** HTTP REST (JSON)
- **Endpoints & Code Locations:**
  - `/meta/features` — Returns backend feature flags (e.g., supported codecs, limits)
    - Location: `backend/src/sandor_backend/api/control.py:get_features`
  - `/meta/datasets` — Lists available datasets and their columns
    - Location: `backend/src/sandor_backend/api/control.py:list_datasets`
  - `/meta/datasets/{dataset_id}` — Returns metadata for a specific dataset
    - Location: `backend/src/sandor_backend/api/control.py:dataset_meta`
  - `/actions/request` — Accepts generic control requests (future extensibility)
    - Location: `backend/src/sandor_backend/api/control.py:handle_control`
  - `/actions/prepare-slice` — Prepares a data slice and returns a handle (future, not required for direct slice fetch)
    - Location: `backend/src/sandor_backend/api/control.py:prepare_slice`
- **Content-Type:** `application/json`
- **Frontend Usage:**
  - Transport client: `frontend/src/lib/transport/client.js` (methods: `listDatasets`, `datasetMeta`, etc.)
  - DataFrameViewer: `frontend/src/components/panels/DataFrameViewer.jsx` (uses transport client to discover datasets/columns)

## Data-plane (Bulk Data Transfer)
- **Transport:** HTTP POST/GET (binary streaming)
- **Endpoints & Code Locations:**
  - `/data/slice` — POST: Returns a binary Arrow IPC stream or Parquet file for requested columns/rows
    - Location: `backend/src/sandor_backend/api/data.py:get_slice`
  - `/data/fetch/{handle}.arrow` — GET: Returns Arrow stream for a prepared handle (future)
    - Location: `backend/src/sandor_backend/api/data.py:fetch_arrow`
  - `/data/fetch/{handle}.parquet` — GET: Returns Parquet file for a prepared handle (future)
    - Location: `backend/src/sandor_backend/api/data.py:fetch_parquet`
- **Content-Type:**
  - Arrow: `application/vnd.apache.arrow.stream`
  - Parquet: `application/parquet`
- **Frontend Usage:**
  - Transport client: `frontend/src/lib/transport/client.js` (methods: `fetchSlice`, `fetchByUrl`)
  - Arrow parsing: `frontend/src/lib/arrow/utils.js` (function: `parseArrowToColumns`)
  - DataFrameViewer: `frontend/src/components/panels/DataFrameViewer.jsx` (requests column data for plotting)

## Dataset Registry (Backend)
- **Source:** Python dict `DATA` in `backend/src/sandor_backend/storage/user_data.py`
- **Registry Logic:**
  - Registry: `backend/src/sandor_backend/services/dataset_registry.py`
  - App startup: `backend/src/sandor_backend/api/app.py` calls `dataset_registry.init()`
- **Usage:**
  - User populates `DATA` with any number of pandas DataFrames
  - Registry exposes dataset IDs and columns via control-plane endpoints

## Frontend Integration
- **TransportClient abstraction:**
  - Location: `frontend/src/lib/transport/client.js`
  - All network calls go through this client layer (no direct fetch in components)
  - Control-plane: JSON requests/responses
  - Data-plane: Binary Arrow/Parquet fetches
- **Arrow Parsing:**
  - Location: `frontend/src/lib/arrow/utils.js`
  - Frontend parses Arrow IPC streams to JS arrays for plotting
  - All columns treated as numeric; Int64 coerced to Number for compatibility
- **DataFrameViewer:**
  - Location: `frontend/src/components/panels/DataFrameViewer.jsx`
  - Discovers datasets/columns, requests column data, and renders plots

## Extensibility
- **No hard-coded dataset or column names**
- **Content negotiation:**
  - Control: `Accept: application/json`
  - Data: `Accept: application/vnd.apache.arrow.stream` or `application/parquet`
- **Future:**
  - WebSocket for progress/events
  - Pluggable codecs/transports

---

## Example: DataFrame Communication Flow

**Goal:** Frontend wants to plot two columns from a user-provided DataFrame.

1. **Discover available datasets and columns (metadata):**
   - Frontend calls `TransportClient.listDatasets()`
   - Backend endpoint: `/meta/datasets` (see `control.py:list_datasets`)
   - Response: `[{"dataset_id": "my_df", "columns": ["col1", "col2", "col3"]}]`

2. **User selects a dataset and columns in the UI:**
   - DataFrameViewer presents dropdowns for dataset and columns
   - User picks `my_df`, X=`col1`, Y=`col2`

3. **Request column data for plotting:**
   - Frontend calls `TransportClient.fetchSlice({ dataset_id: "my_df", columns: ["col1", "col2"], row_range: [0, 10000], format_hint: "arrow" })`
   - Backend endpoint: `/data/slice` (see `data.py:get_slice`)
   - Backend streams Arrow IPC for just those columns and rows

4. **Parse and plot:**
   - Frontend parses Arrow IPC with `parseArrowToColumns` (see `arrow/utils.js`)
   - DataFrameViewer updates plot with the received arrays

5. **Repeat as needed:**
   - User changes dataset or columns; frontend repeats steps 2–4

---

_This file is a living reference. Update as new features or protocols are added._
