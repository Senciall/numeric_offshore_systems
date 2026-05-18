# Offshore Systems Documentation Hub

Internal documentation tool for offshore engineering systems. Drafters build clickable wire diagrams of platform equipment, and field crews browse the documents attached to each diagram icon.

## Prerequisites

- Python 3.11 or later. Python 3.13 has been verified.
- No Node build step is required; the frontend is plain HTML, CSS, and ES modules.

## Install

```powershell
cd offshore-docs
python -m venv .venv
.\.venv\Scripts\activate
pip install -r backend\requirements.txt
```

Linux / macOS: `source .venv/bin/activate`.

## Run

```powershell
cd offshore-docs
.\start_server.ps1
```

Open `http://localhost:8000`. The first run creates `data/docs.db` and seeds it with one demo platform and a small custom wire diagram.

The server binds to `0.0.0.0`, so anyone on the same LAN can reach it via the host PC's IP, for example `http://10.0.0.42:8000`.

For live backend reloads during development:

```powershell
.\start_server.ps1 -Reload
```

## How To Use

- View mode is the default. Pick a platform from the header dropdown, then click an icon to see its attached documents in the left info panel.
- Edit mode is unlocked from the header. The password defaults to `offshore` unless `OFFSHORE_EDIT_PASSWORD` is set.
- The right editor panel has a Diagram tab for adding parts, editing icon labels, deleting icons, and deleting selected wires.
- Wire creation uses connector dots. In edit mode, click one connector dot, then click another connector dot to create a wire.
- The Part Creator tab saves reusable image parts. Choose a PNG, JPG, WEBP, or SVG, place connector dots on the preview, assign dot roles if needed, then save the part to the library.
- To import the local Phoenix Contact `Parts Library` folder into the diagram parts list, run:
  ```powershell
  cd offshore-docs\backend
  ..\.venv\Scripts\python.exe .\import_parts_library.py
  ```
- Documents are attached to the selected icon from the left panel. New icons are auto-saved before document upload so the file can attach to the right node id.

## Maintenance Checks

Before and after cleanup work that touches parts, icons, documents, or importer-related code, run the read-only parts checker:

```powershell
cd offshore-docs\backend
..\.venv\Scripts\python.exe .\check_parts_integrity.py
```

The checker reads `data/docs.db`, imported part files, and `..\Parts Library\parts_index.csv`. It does not modify the database, saved diagrams, or the protected `Parts Library` folder.

Additional maintenance notes live in:

- `docs/EDITOR_GUIDE.md`
- `docs/PROJECT_MAP.md`
- `docs/PARTS_LIBRARY_CONTRACT.md`

## Backups

All persistent state lives under `offshore-docs/data/`:

```text
data/
  docs.db    SQLite database
  files/     Uploaded PDFs and images, organized by node id
  icons/     Reusable part icon images and imported parts-library thumbnails
  part_docs/ Imported parts-library reference files and reusable part docs
```

To back up: stop the server, copy the entire `data/` folder, restart. To restore: stop the server, replace `data/`, restart.

## Project Structure

```text
offshore-docs/
  backend/
    main.py          FastAPI app, all API endpoints, static mount
    db.py            SQLite schema, connection helper, first-run seed
    models.py        Pydantic request/response models
    import_parts_library.py
                    Import ../Parts Library into app data
    check_parts_integrity.py
                    Read-only verification for parts-library imports
    requirements.txt
  frontend/
    index.html       Header, document panel, custom diagram stage, editor panel
    app.js           Custom diagram engine and editor interactions
    icons.js         Built-in SVG part library
    styles.css       Dark grey app shell and custom diagram styling
  data/
    docs.db          Created on first run
    files/           Uploaded files
    icons/           Uploaded part icons
    part_docs/       Imported and uploaded reusable part documents
```

## API Surface

| Method | Path | Notes |
|--------|------|-------|
| `GET` | `/api/health` | liveness check |
| `GET` | `/api/platforms` | list platforms |
| `POST` | `/api/platforms` | `{ name, description? }` creates a platform |
| `GET` | `/api/platforms/{id}/diagram` | custom diagram JSON |
| `PUT` | `/api/platforms/{id}/diagram` | save custom diagram JSON and sync the `nodes` table |
| `GET` | `/api/nodes/{id}/files` | list files attached to a node |
| `POST` | `/api/nodes/{id}/files` | multipart upload, key `file` |
| `GET` | `/api/files/{id}` | stream the file |
| `GET` | `/api/files/{id}/meta` | file metadata only |
| `DELETE` | `/api/files/{id}` | remove the DB row and file |
| `GET` | `/api/icons` | list reusable parts, including connector templates and documents |
| `POST` | `/api/icons` | multipart icon upload, keys `name`, `file`, optional `connectors_json` |
| `GET` | `/api/icons/{id}` | stream a saved part icon |
| `DELETE` | `/api/icons/{id}` | remove a reusable part |

All errors return `{"error": "<message>"}` with an appropriate HTTP status.

## Limits

- Documents are intended for PDF, JPG, PNG, and WEBP files up to 50 MB per file.
- Reusable part icons can be PNG, JPG, WEBP, or SVG files up to 5 MB per icon.
- This is still an internal LAN tool: edit mode has a shared password, CORS is open for development, and full production authentication is still a v2 task.
