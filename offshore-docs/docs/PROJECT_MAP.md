# Project Map

This app is a local FastAPI backend with a static HTML/CSS/JavaScript frontend.
There is no frontend build step.

## Runtime Entry Points

- `backend/main.py` starts the FastAPI app, exposes all API routes, and serves the frontend.
- `frontend/index.html` is the browser entry point.
- `frontend/app.js` contains the diagram editor, parts library UI, document explorer, and part creator behavior.
- `frontend/styles.css` contains the application layout and editor styling.
- `start_server.ps1` starts Uvicorn from the project virtual environment.

## Persistent Data

All app state lives under `data/`:

- `data/docs.db` is the SQLite database.
- `data/files/` stores files attached to diagram nodes.
- `data/icons/` stores reusable part icon images.
- `data/icons/parts_library/` stores imported parts-library thumbnails.
- `data/part_docs/` stores reusable part reference documents.
- `data/part_docs/parts_library/` stores imported parts-library reference files.
- `data/project_files/` stores project explorer uploads.

Treat `data/` as runtime state, not source code. Do not delete or rewrite it as part of cleanup without an explicit backup and approval.

## Protected Parts Library Flow

The external `../Parts Library/` folder is the source of imported part metadata and images.

The importer is:

- `backend/import_parts_library.py`

It reads:

- `../Parts Library/parts_index.csv`
- per-part folders under `../Parts Library/`

It writes imported copies into:

- `data/icons/parts_library/`
- `data/part_docs/parts_library/`
- `data/docs.db`

The app renders parts through:

- `GET /api/icons`
- `GET /api/icons/{icon_id}`
- diagram node `icon` values like `custom:40`

## Safe Cleanup Targets

These can generally be improved without changing behavior:

- Documentation under `docs/`
- Ignore rules for generated files
- Read-only verification scripts
- Internal comments and section headers
- Small helper extraction that preserves all public paths and data formats

## High-Risk Cleanup Targets

These need extra care or approval:

- Renaming or moving anything under `../Parts Library/`
- Changing `parts_index.csv`
- Deleting files under `data/icons/parts_library/` or `data/part_docs/parts_library/`
- Changing API paths or response shapes
- Changing saved diagram JSON format
- Changing icon IDs, part numbers, connector templates, folders, image selection, or document import logic
