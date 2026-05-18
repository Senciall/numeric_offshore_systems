# Editor Guide

This guide is for anyone editing or refactoring this project. The goal is to keep the app maintainable without breaking the diagram editor, saved diagrams, uploaded files, or the protected parts library.

## Core Rule

Preserve behavior first. Cleanup is useful only if the app still works exactly as it did before.

Do not change public APIs, saved JSON formats, database schemas, part IDs, part folders, connector definitions, file paths, or import paths unless there is a specific migration plan and approval.

## Protected Areas

Do not delete, rename, move, regenerate, or reorganize these without explicit approval:

- `../Parts Library/`
- `../Parts Library/parts_index.csv`
- `offshore-docs/data/docs.db`
- `offshore-docs/data/icons/parts_library/`
- `offshore-docs/data/part_docs/parts_library/`
- saved diagram JSON stored in the database

The parts library is core functionality. Treat it as source data, not cleanup clutter.

## Important Runtime Files

- `backend/main.py` contains the FastAPI app and API routes.
- `backend/db.py` defines the SQLite schema and data directories.
- `backend/import_parts_library.py` imports `../Parts Library/` into app data.
- `backend/check_parts_integrity.py` is read-only and verifies imported part health.
- `frontend/index.html` defines the static page structure.
- `frontend/app.js` contains the editor behavior and parts UI.
- `frontend/styles.css` contains layout and visual styling.
- `frontend/icons.js` contains built-in SVG equipment icons.

## Data Flow For Parts

1. Source files live in `../Parts Library/`.
2. `backend/import_parts_library.py` reads `parts_index.csv` and per-part folders.
3. Imported icon copies are written under `data/icons/parts_library/`.
4. Imported reference files are written under `data/part_docs/parts_library/`.
5. Metadata is stored in `data/docs.db`.
6. The frontend reads parts from `GET /api/icons`.
7. Diagram nodes reference reusable parts with `custom:{icon_id}`.

When editing code around this flow, preserve part numbers, names, folders, descriptions, links, connector templates, document metadata, image filenames, and icon IDs unless a migration has been approved.

## Safe Editing Workflow

1. Read the nearby code before changing it.
2. Make the smallest useful change.
3. Avoid unrelated formatting churn.
4. Do not mix cleanup with behavior changes.
5. Run the relevant checks.
6. Document any intentional behavior change.

For parts-related work, run:

```powershell
cd offshore-docs\backend
..\.venv\Scripts\python.exe .\check_parts_integrity.py
```

For frontend JavaScript syntax:

```powershell
cd ..
node --check .\offshore-docs\frontend\app.js
```

For backend Python syntax:

```powershell
cd offshore-docs
.\.venv\Scripts\python.exe -m py_compile .\backend\main.py .\backend\db.py .\backend\models.py .\backend\import_parts_library.py .\backend\check_parts_integrity.py
```

For server health:

```powershell
Invoke-RestMethod http://127.0.0.1:8000/api/health
```

## Safe Cleanup Examples

These are usually safe if verified:

- adding documentation under `docs/`
- adding comments that clarify existing behavior
- adding read-only verification scripts
- improving `.gitignore` for generated local artifacts
- renaming local variables inside a function
- extracting a small helper while keeping function behavior identical
- fixing stale README text

## Risky Cleanup Examples

These need extra review:

- splitting `frontend/app.js` into modules
- splitting `frontend/styles.css`
- splitting `backend/main.py` into routers
- changing import paths or static asset URLs
- changing endpoint response shapes
- changing diagram rendering behavior
- changing icon lookup, cache busting, or image selection
- changing importer matching rules
- changing database migrations

## Approval Required

Ask before:

- deleting files
- moving files
- renaming public functions, IDs, classes, or API routes
- changing `Parts Library` files or folders
- changing `parts_index.csv`
- modifying database rows directly
- rewriting saved diagrams
- changing category names
- changing connector defaults
- removing stale-looking imported images or documents

## Frontend Notes

`frontend/app.js` is large and stateful. It includes platform loading, diagram rendering, wire routing, selection tools, parts library UI, part creator, document explorer, and file viewer behavior.

When editing it:

- keep `App.state` fields compatible
- preserve event listener behavior
- preserve `custom:{id}` icon references
- preserve `exportDiagram()` and `normalizeDiagram()` output shape
- preserve toolbar IDs and element IDs used by event binding
- run `node --check frontend/app.js`

`frontend/styles.css` is also large. When editing it:

- avoid global rules that unintentionally hide nodes, images, labels, or connector dots
- check both edit mode and view mode
- preserve mobile and print media rules
- keep cache-busting query strings in `index.html` current when CSS/JS changes must bypass browser cache

## Backend Notes

`backend/main.py` owns the API surface. When editing it:

- preserve route paths and methods
- preserve Pydantic response models
- preserve file storage paths stored in the database
- preserve MIME handling for uploaded files and icons
- preserve delete behavior and cascade expectations

`backend/db.py` owns schema setup and migrations. When editing it:

- make migrations additive where possible
- do not remove columns used by saved data
- keep foreign key behavior intact
- verify existing databases still initialize

`backend/import_parts_library.py` is sensitive. When editing it:

- run the read-only checker before and after
- do not change image selection or folder assignment casually
- preserve current connector generation
- preserve imported reference files
- do not mutate `../Parts Library/`

## Known Current Warnings

The integrity checker may report old demo/test diagram references:

- `Server -> custom:2`
- `adams -> custom:3`

These are warnings, not blocking errors. Do not repair or delete them unless the project owner approves how they should be handled.

## Final Checklist Before Hand-Off

- App starts successfully.
- `/api/health` returns OK.
- `/api/icons` returns the expected parts.
- `check_parts_integrity.py` has no blocking errors.
- Frontend syntax check passes if `app.js` changed.
- Python compile check passes if backend code changed.
- Parts library files were not moved, renamed, deleted, or regenerated.
- Any cache-busted JS/CSS URL in `index.html` was updated if needed.
