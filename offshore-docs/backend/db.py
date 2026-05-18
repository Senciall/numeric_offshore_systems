"""SQLite connection, schema, and first-run seed for the offshore docs hub."""
from __future__ import annotations

import json
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterator

PROJECT_ROOT: Path = Path(__file__).resolve().parent.parent
DATA_DIR: Path = PROJECT_ROOT / "data"
FILES_DIR: Path = DATA_DIR / "files"
ICONS_DIR: Path = DATA_DIR / "icons"
PART_DOCS_DIR: Path = DATA_DIR / "part_docs"
PROJECT_FILES_DIR: Path = DATA_DIR / "project_files"
DB_PATH: Path = DATA_DIR / "docs.db"


SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS platforms (
    id          INTEGER PRIMARY KEY,
    name        TEXT NOT NULL,
    description TEXT,
    created_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS diagrams (
    platform_id   INTEGER PRIMARY KEY,
    drawflow_json TEXT NOT NULL,
    updated_at    TEXT NOT NULL,
    FOREIGN KEY (platform_id) REFERENCES platforms(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS nodes (
    id          TEXT PRIMARY KEY,
    platform_id INTEGER NOT NULL,
    diagram_ref TEXT DEFAULT 'root',
    label       TEXT NOT NULL,
    kind        TEXT,
    icon        TEXT DEFAULT 'generic',
    port_in     INTEGER DEFAULT 1,
    port_out    INTEGER DEFAULT 1,
    FOREIGN KEY (platform_id) REFERENCES platforms(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS subdiagrams (
    id             INTEGER PRIMARY KEY,
    platform_id    INTEGER NOT NULL,
    parent_node_id TEXT NOT NULL,
    name           TEXT NOT NULL,
    drawflow_json  TEXT NOT NULL,
    created_at     TEXT NOT NULL,
    updated_at     TEXT NOT NULL,
    FOREIGN KEY (platform_id) REFERENCES platforms(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_node_id) REFERENCES nodes(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS node_files (
    id           INTEGER PRIMARY KEY,
    node_id      TEXT NOT NULL,
    filename     TEXT NOT NULL,
    stored_path  TEXT NOT NULL,
    mime_type    TEXT NOT NULL,
    size_bytes   INTEGER NOT NULL,
    uploaded_at  TEXT NOT NULL,
    category     TEXT DEFAULT NULL,
    notes        TEXT,
    FOREIGN KEY (node_id) REFERENCES nodes(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS icons (
    id           INTEGER PRIMARY KEY,
    name         TEXT NOT NULL,
    filename     TEXT NOT NULL,
    stored_path  TEXT NOT NULL,
    mime_type    TEXT NOT NULL,
    uploaded_at  TEXT NOT NULL,
    connectors_json TEXT DEFAULT '[]',
    shapes_json  TEXT DEFAULT '[]',
    folder       TEXT DEFAULT 'Unsorted',
    description  TEXT,
    part_number  TEXT,
    links_json   TEXT DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS icon_files (
    id           INTEGER PRIMARY KEY,
    icon_id      INTEGER NOT NULL,
    filename     TEXT NOT NULL,
    stored_path  TEXT NOT NULL,
    mime_type    TEXT NOT NULL,
    size_bytes   INTEGER NOT NULL,
    uploaded_at  TEXT NOT NULL,
    folder       TEXT DEFAULT 'Documents',
    FOREIGN KEY (icon_id) REFERENCES icons(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS icon_folders (
    name       TEXT PRIMARY KEY,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS project_folders (
    id          INTEGER PRIMARY KEY,
    platform_id INTEGER NOT NULL,
    diagram_ref TEXT NOT NULL DEFAULT 'root',
    parent_id   INTEGER,
    name        TEXT NOT NULL,
    created_at  TEXT NOT NULL,
    FOREIGN KEY (platform_id) REFERENCES platforms(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES project_folders(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS project_files (
    id          INTEGER PRIMARY KEY,
    platform_id INTEGER NOT NULL,
    diagram_ref TEXT NOT NULL DEFAULT 'root',
    folder_id   INTEGER,
    filename    TEXT NOT NULL,
    stored_path TEXT NOT NULL,
    mime_type   TEXT NOT NULL,
    size_bytes  INTEGER NOT NULL,
    uploaded_at TEXT NOT NULL,
    FOREIGN KEY (platform_id) REFERENCES platforms(id) ON DELETE CASCADE,
    FOREIGN KEY (folder_id) REFERENCES project_folders(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_nodes_platform  ON nodes(platform_id);
CREATE INDEX IF NOT EXISTS idx_subdiagrams_platform ON subdiagrams(platform_id);
CREATE INDEX IF NOT EXISTS idx_subdiagrams_parent   ON subdiagrams(parent_node_id);
CREATE INDEX IF NOT EXISTS idx_files_node      ON node_files(node_id);
CREATE INDEX IF NOT EXISTS idx_icon_files_icon ON icon_files(icon_id);
CREATE INDEX IF NOT EXISTS idx_project_folders_scope ON project_folders(platform_id, diagram_ref);
CREATE INDEX IF NOT EXISTS idx_project_folders_parent ON project_folders(parent_id);
CREATE INDEX IF NOT EXISTS idx_project_files_scope ON project_files(platform_id, diagram_ref);
CREATE INDEX IF NOT EXISTS idx_project_files_folder ON project_files(folder_id);
"""

# Columns added after initial v1 release, applied as safe migrations.
_MIGRATIONS = [
    ("nodes",      "icon",     "TEXT DEFAULT 'generic'"),
    ("nodes",      "port_in",  "INTEGER DEFAULT 1"),
    ("nodes",      "port_out", "INTEGER DEFAULT 1"),
    ("nodes",      "diagram_ref", "TEXT DEFAULT 'root'"),
    ("node_files", "category", "TEXT DEFAULT NULL"),
    ("icons",      "connectors_json", "TEXT"),
    ("icons",      "shapes_json", "TEXT DEFAULT '[]'"),
    ("icons",      "folder", "TEXT DEFAULT 'Unsorted'"),
    ("icons",      "description", "TEXT"),
    ("icons",      "part_number", "TEXT"),
    ("icons",      "links_json", "TEXT DEFAULT '[]'"),
    ("icon_files", "folder", "TEXT DEFAULT 'Documents'"),
]


def utcnow_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def _connect() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


@contextmanager
def get_conn() -> Iterator[sqlite3.Connection]:
    conn = _connect()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def _apply_migrations(conn: sqlite3.Connection) -> None:
    for table, col, defn in _MIGRATIONS:
        try:
            conn.execute(f"ALTER TABLE {table} ADD COLUMN {col} {defn}")
        except sqlite3.OperationalError as exc:
            if "duplicate column name" not in str(exc).lower():
                raise


def _node_html(label: str, icon: str = "generic") -> str:
    icon_html = (
        f'<img class="node-icon-img" src="/api/icons/{icon.split(":")[1]}">'
        if icon.startswith("custom:")
        else f'<div class="node-icon-svg" data-icon="{icon}"></div>'
    )
    return (
        '<div class="node-body">'
        f'{icon_html}'
        f'<div class="node-label">{label}</div>'
        '<div class="node-doc-badge" data-count="0">0</div>'
        '</div>'
    )


def _seed_diagram_json() -> dict:
    return {
        "version": 2,
        "nodes": [
            {
                "id": "1",
                "label": "Emergency Generator",
                "icon": "generator",
                "x": 80,
                "y": 220,
                "w": 154,
                "h": 132,
                "connectors": [
                    {"id": "out-1", "x": 1, "y": 0.5, "role": "output", "label": "OUT"},
                ],
            },
            {
                "id": "2",
                "label": "Main Switchboard",
                "icon": "switchboard",
                "x": 360,
                "y": 220,
                "w": 154,
                "h": 132,
                "connectors": [
                    {"id": "in-1", "x": 0, "y": 0.5, "role": "input", "label": "IN"},
                    {"id": "out-1", "x": 1, "y": 0.3, "role": "output", "label": "MCC-01"},
                    {"id": "out-2", "x": 1, "y": 0.7, "role": "output", "label": "MCC-02"},
                ],
            },
            {
                "id": "3",
                "label": "MCC-01",
                "icon": "mcc",
                "x": 650,
                "y": 120,
                "w": 154,
                "h": 132,
                "connectors": [
                    {"id": "in-1", "x": 0, "y": 0.5, "role": "input", "label": "IN"},
                ],
            },
            {
                "id": "4",
                "label": "MCC-02",
                "icon": "mcc",
                "x": 650,
                "y": 320,
                "w": 154,
                "h": 132,
                "connectors": [
                    {"id": "in-1", "x": 0, "y": 0.5, "role": "input", "label": "IN"},
                ],
            },
        ],
        "wires": [
            {"id": "wire-1", "from": {"nodeId": "1", "connectorId": "out-1"}, "to": {"nodeId": "2", "connectorId": "in-1"}},
            {"id": "wire-2", "from": {"nodeId": "2", "connectorId": "out-1"}, "to": {"nodeId": "3", "connectorId": "in-1"}},
            {"id": "wire-3", "from": {"nodeId": "2", "connectorId": "out-2"}, "to": {"nodeId": "4", "connectorId": "in-1"}},
        ],
        "viewport": {"x": 0, "y": 0, "zoom": 1},
    }


def _seed_if_empty(conn: sqlite3.Connection) -> None:
    if conn.execute("SELECT COUNT(*) AS n FROM platforms").fetchone()["n"] > 0:
        return
    now = utcnow_iso()
    cur = conn.execute(
        "INSERT INTO platforms (name, description, created_at) VALUES (?, ?, ?)",
        ("Platform A — Demo", "Seed platform for demonstration.", now),
    )
    pid = cur.lastrowid
    diagram = _seed_diagram_json()
    conn.execute(
        "INSERT INTO diagrams (platform_id, drawflow_json, updated_at) VALUES (?, ?, ?)",
        (pid, json.dumps(diagram), now),
    )
    for nd in diagram["nodes"]:
        connectors = nd.get("connectors") or []
        port_in = sum(1 for c in connectors if c.get("role") == "input")
        port_out = sum(1 for c in connectors if c.get("role") == "output")
        conn.execute(
            "INSERT INTO nodes (id, platform_id, diagram_ref, label, kind, icon, port_in, port_out) VALUES (?,?,?,?,?,?,?,?)",
            (nd["id"], pid, "root", nd["label"], "equipment", nd["icon"], port_in, port_out),
        )


def init_db() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    FILES_DIR.mkdir(parents=True, exist_ok=True)
    ICONS_DIR.mkdir(parents=True, exist_ok=True)
    PART_DOCS_DIR.mkdir(parents=True, exist_ok=True)
    PROJECT_FILES_DIR.mkdir(parents=True, exist_ok=True)
    with get_conn() as conn:
        conn.executescript(SCHEMA_SQL)
        _apply_migrations(conn)
        conn.execute("CREATE INDEX IF NOT EXISTS idx_nodes_diagram ON nodes(platform_id, diagram_ref)")
        conn.execute(
            "INSERT OR IGNORE INTO icon_folders (name, created_at) VALUES (?, ?)",
            ("Unsorted", utcnow_iso()),
        )
        _seed_if_empty(conn)
