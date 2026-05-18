# Build: Offshore Systems Documentation Hub — v1

I'm building an internal documentation tool for our company's offshore engineering systems. It will run on a dedicated office PC and be accessed over the local network by drafters and offshore field crews. This is **version 1** — a working MVP, not a polished product. Prioritize getting all three panels wired together end-to-end over feature depth.

## What I'm building

A single-page web app with three panels (left, middle, right) plus a top header. The middle panel is the primary navigation: users build clickable flow diagrams of offshore systems, and clicking a node drives the other two panels.

**The flow:** User picks a platform → sees its system flow diagram in the middle panel → clicks a node (e.g. "MCC-01") → left panel shows the files attached to that node → user clicks a file → right panel renders it inline (PDF, image, etc.).

Drafters can edit the diagram (add nodes, draw edges, attach files). Field crews use view mode (read-only).

## Tech stack — already decided, don't suggest alternatives

- **Backend:** Python 3.11+ with FastAPI, Uvicorn, SQLite (single file DB)
- **Frontend:** Vanilla HTML/CSS/JS — no React, no build step
- **Diagram editor:** Drawflow (https://github.com/jerosoler/Drawflow) — vanilla JS, single-file include
- **PDF rendering:** PDF.js via CDN, embedded in an iframe
- **File storage:** Files on disk under `./data/files/`, paths stored in SQLite
- **Server:** Runs locally with `uvicorn main:app --host 0.0.0.0 --port 8000`

## Project structure

```
offshore-docs/
├── backend/
│   ├── main.py              # FastAPI app, all endpoints
│   ├── db.py                # SQLite connection + schema init
│   ├── models.py            # Pydantic models
│   └── requirements.txt
├── frontend/
│   ├── index.html           # Three-panel layout
│   ├── app.js               # Wires panels together, API calls
│   ├── styles.css           # Layout (CSS Grid), styling
│   └── lib/                 # Drawflow vendored locally
├── data/
│   ├── docs.db              # SQLite (created on first run)
│   └── files/               # Uploaded PDFs, images
├── README.md                # How to run, how to develop
└── .gitignore
```

## Data model

```sql
CREATE TABLE platforms (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE diagrams (
    -- One diagram per platform for v1. Stores the full Drawflow JSON state.
    platform_id INTEGER PRIMARY KEY,
    drawflow_json TEXT NOT NULL,  -- Drawflow's native export format
    updated_at TEXT NOT NULL,
    FOREIGN KEY (platform_id) REFERENCES platforms(id)
);

CREATE TABLE nodes (
    -- Mirror of nodes in the Drawflow JSON, denormalized for queries.
    id TEXT PRIMARY KEY,           -- Drawflow node ID (string)
    platform_id INTEGER NOT NULL,
    label TEXT NOT NULL,
    kind TEXT,                     -- e.g. 'system', 'subsystem', 'equipment'
    FOREIGN KEY (platform_id) REFERENCES platforms(id)
);

CREATE TABLE node_files (
    id INTEGER PRIMARY KEY,
    node_id TEXT NOT NULL,
    filename TEXT NOT NULL,        -- Original upload filename
    stored_path TEXT NOT NULL,     -- Relative path under data/files/
    mime_type TEXT NOT NULL,
    size_bytes INTEGER NOT NULL,
    uploaded_at TEXT NOT NULL,
    notes TEXT,
    FOREIGN KEY (node_id) REFERENCES nodes(id)
);
```

On startup, if `docs.db` doesn't exist, create it and seed with one example platform ("Platform A — Demo") with 3-4 example nodes (e.g. "Main Switchboard", "MCC-01", "Emergency Generator") and a couple of edges so there's something visible immediately.

## API endpoints

All endpoints return JSON unless noted. Use Pydantic models for request/response.

```
GET  /api/platforms                          → list of platforms
POST /api/platforms                          → create platform { name, description }
GET  /api/platforms/{id}/diagram             → { drawflow_json: {...} }
PUT  /api/platforms/{id}/diagram             → save full Drawflow JSON; also sync nodes table
GET  /api/nodes/{node_id}/files              → list of files attached to a node
POST /api/nodes/{node_id}/files              → multipart upload, returns file metadata
GET  /api/files/{file_id}                    → streams the file (Content-Type from mime_type)
GET  /api/files/{file_id}/meta               → file metadata only
DELETE /api/files/{file_id}                  → delete file (DB row + disk)
```

**Important:** When the diagram is saved via `PUT /api/platforms/{id}/diagram`, parse the Drawflow JSON and upsert the `nodes` table so node labels stay queryable. Delete `nodes` rows that are no longer in the diagram (cascade delete their `node_files` too — but in v1 just leave orphaned files on disk for safety; we'll add cleanup later).

Serve the frontend from FastAPI itself: mount `/` to serve `frontend/index.html` and static assets. No separate dev server needed.

## Frontend layout

CSS Grid, three columns, full viewport height:

```
┌──────────────────────────────────────────────────────────────┐
│ Header — platform selector dropdown, "Edit mode" toggle      │
├────────────┬─────────────────────────┬───────────────────────┤
│            │                         │                       │
│  Files     │   Flow diagram          │   Viewer              │
│  panel     │   (Drawflow canvas)     │   (PDF.js / img)      │
│            │                         │                       │
│  ~240px    │   flexible              │   ~45% of remainder   │
│            │                         │                       │
└────────────┴─────────────────────────┴───────────────────────┘
```

### Header
- Platform dropdown (loads from `/api/platforms`, switching reloads the diagram)
- "Edit mode" toggle (checkbox or switch). When OFF, Drawflow is in `editor_mode = 'fixed'` (no dragging, no edits). When ON, full editing.
- "Save diagram" button (only visible in edit mode) — POSTs current Drawflow state to the API
- "+ Add node" button (edit mode only) — adds a generic node at canvas center

### Middle panel — Drawflow
- Initialize Drawflow with the platform's saved JSON
- Custom node template: a rounded rectangle with a label and a small file count badge (e.g. "3 files"). Use Drawflow's HTML node feature.
- Single click on a node → set as "selected node", trigger left + right panel updates
- Double click on a node in edit mode → prompt for new label, save
- Right-click on a node in edit mode → delete option

### Left panel — Files
- Heading shows currently selected node's label, or "Select a node" if none
- Below: list of files (filename, size, upload date)
- Each file is clickable → loads in right panel
- In edit mode: a drop zone at the top accepting drag-and-drop uploads, plus a file picker button. Uploaded files immediately appear in the list.
- Each file row in edit mode has a small delete (×) button

### Right panel — Viewer
- If selected file is a PDF: embed PDF.js viewer in an iframe pointing at `/api/files/{id}` (use the PDF.js prebuilt viewer, vendor it under `frontend/lib/pdfjs/`)
- If selected file is an image (jpg/png/webp): `<img src="/api/files/{id}">` with object-fit contain
- If neither: show "Preview not supported — [download link]"
- Empty state: "Select a file to preview"

## Acceptance criteria — what "done" means for v1

The build is done when I can do all of this without errors:

1. Run `pip install -r requirements.txt` and `uvicorn main:app --reload --host 0.0.0.0 --port 8000`
2. Open `http://localhost:8000` in a browser
3. See the demo platform loaded with a few example nodes connected by edges
4. Toggle edit mode ON
5. Add a new node, label it, drag an edge from an existing node to it
6. Click "Save diagram" — refresh the page, changes persist
7. Click a node — left panel updates to show its files (empty initially)
8. Drag a PDF onto the file panel — it uploads and appears in the list
9. Click the PDF in the file list — it renders in the right panel via PDF.js
10. Upload an image — it renders in the right panel as an `<img>`
11. Toggle edit mode OFF — diagram becomes read-only, no edit controls visible
12. Create a second platform via API (curl is fine for v1) — appears in dropdown, switching loads its (empty) diagram

## Constraints and conventions

- **No authentication in v1.** It's on an internal network. Add a TODO comment in `main.py` noting auth needs to be added before any external exposure.
- **CORS:** Allow all origins for v1 (we'll lock this down later).
- **File size limit:** 50 MB per upload. Reject larger with a clear error.
- **Allowed file types:** PDF, JPG, PNG, WEBP. Reject others with a clear error message in the UI.
- **No tests in v1** — get it working end-to-end first. We'll add pytest in v2.
- **Logging:** Use Python's `logging` module, log all uploads and diagram saves.
- **Error handling:** API errors return `{ "error": "message" }` with appropriate HTTP status. Frontend shows errors as a small toast or inline message — don't use `alert()`.
- **Code style:** Type hints throughout the Python. ES modules in JS, no jQuery, no global pollution beyond a single `App` namespace.

## README requirements

Include a README.md covering:
- One-line description
- Prerequisites (Python 3.11+)
- Install steps
- Run command
- Default URL and that it serves to all interfaces (LAN-accessible)
- How to back up (copy `data/` folder)
- Project structure overview
- Known limitations (no auth, single diagram per platform, etc.)
- TODO list for v2 (gap tracking, revisions, search, auth, multi-diagram-per-platform)

## Build order I want you to follow

1. Backend skeleton: project structure, requirements.txt, db.py with schema + seed data, main.py with health-check endpoint. Verify it runs.
2. Backend endpoints — platforms, diagrams, nodes, files. Test each with curl as you build.
3. Frontend shell — three-panel HTML/CSS layout with placeholder content, served by FastAPI.
4. Wire up Drawflow in the middle panel, loading and rendering the seeded diagram.
5. Wire up node click → file panel update.
6. Wire up file click → PDF.js / image viewer.
7. Edit mode: save diagram, add nodes, upload files, delete files.
8. README + final smoke test against the acceptance criteria.

After each step, briefly summarize what was built and confirm it works before moving on. If you hit a decision point I haven't covered, make a reasonable choice, note it, and continue — don't block on me.

Start with step 1.