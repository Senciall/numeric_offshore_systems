"""FastAPI app — Offshore Systems Documentation Hub.

TODO(security): No authentication beyond the edit-mode password below.
Intended for a trusted internal LAN only. Add proper auth before any
external exposure and tighten CORS.
"""
from __future__ import annotations

import json
import logging
import mimetypes
import os
import re
import shutil
import sqlite3
import uuid
from pathlib import Path
from typing import Any

from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, Response
from fastapi.staticfiles import StaticFiles

from db import FILES_DIR, ICONS_DIR, PART_DOCS_DIR, PLATFORM_LOGOS_DIR, PROJECT_FILES_DIR, PROJECT_ROOT, get_conn, init_db, utcnow_iso
from models import (
    DiagramOut, DiagramSaveIn, DiagramSaveOut,
    EditAuthRequest, FileMeta, FileNotesUpdate, IconDocumentOut, IconFolderCreate, IconFolderOut, IconOut,
    NodeWithCount, PlatformCreate, PlatformOut, PlatformUpdate, SubdiagramCreate, SubdiagramOut, SubdiagramRename,
    ProjectFolderCreate, ProjectFolderOut, ProjectFolderRename, ProjectFileOut, ProjectTreeOut,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
log = logging.getLogger("offshore-docs")

# --- Edit-mode password (set OFFSHORE_EDIT_PASSWORD env var to change) ------
EDIT_PASSWORD = os.environ.get("OFFSHORE_EDIT_PASSWORD", "offshore")

# --- File constraints --------------------------------------------------------
MAX_UPLOAD_BYTES = 50 * 1024 * 1024  # 50 MB
MAX_ICON_BYTES = 5 * 1024 * 1024     # 5 MB for icons

ICON_ALLOWED_EXTS = {".png", ".jpg", ".jpeg", ".webp", ".svg"}
ICON_EXT_MIME = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".svg": "image/svg+xml",
}

_SAFE_RE = re.compile(r"[^A-Za-z0-9._-]+")


def _sanitize(name: str, maxlen: int = 120) -> str:
    base = os.path.basename(name).strip() or "upload"
    return (_SAFE_RE.sub("_", base) or "upload")[:maxlen]


def _clean_folder_name(name: str) -> str:
    cleaned = re.sub(r"\s+", " ", name.strip())[:80]
    if not cleaned:
        raise HTTPException(status_code=400, detail="Folder name is required.")
    if cleaned.lower() == "built in":
        raise HTTPException(status_code=400, detail="Built In is reserved.")
    return cleaned


def _clean_doc_folder_name(name: str | None) -> str:
    cleaned = re.sub(r"\s+", " ", (name or "Documents").strip())[:80]
    return cleaned or "Documents"


def _clean_diagram_name(name: str) -> str:
    cleaned = re.sub(r"\s+", " ", name.strip())[:120]
    if not cleaned:
        raise HTTPException(status_code=400, detail="Diagram name is required.")
    return cleaned


def _guess_mime(filename: str) -> str:
    mime, _ = mimetypes.guess_type(filename)
    return mime or "application/octet-stream"


def _empty_diagram_json() -> dict[str, Any]:
    return {"version": 2, "nodes": [], "wires": [], "viewport": {"x": 0, "y": 0, "zoom": 1}}


def _connector_counts(connectors: list[dict[str, Any]]) -> tuple[int, int]:
    port_in = sum(1 for c in connectors if c.get("role") == "input")
    port_out = sum(1 for c in connectors if c.get("role") == "output")
    return port_in, port_out


def _clean_hex_color(value: Any, fallback: str) -> str:
    raw = str(value or "").strip()
    if re.fullmatch(r"#[0-9A-Fa-f]{6}", raw):
        return raw.lower()
    return fallback


def _parse_connectors_json(raw: str | None) -> list[dict[str, Any]]:
    if not raw:
        return []
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=400, detail="Invalid connector JSON.") from e
    if not isinstance(parsed, list):
        raise HTTPException(status_code=400, detail="Connector JSON must be a list.")

    connectors: list[dict[str, Any]] = []
    for idx, item in enumerate(parsed):
        if not isinstance(item, dict):
            raise HTTPException(status_code=400, detail="Each connector must be an object.")
        try:
            x = max(0.0, min(1.0, float(item.get("x", 0.5))))
            y = max(0.0, min(1.0, float(item.get("y", 0.5))))
            size = max(8, min(32, int(float(item.get("size", 18) or 18))))
        except (TypeError, ValueError) as e:
            raise HTTPException(status_code=400, detail="Connector positions must be numbers.") from e
        role = str(item.get("role") or "neutral")
        if role not in {"input", "output", "neutral"}:
            role = "neutral"
        connectors.append({
            "id": str(item.get("id") or f"conn-{idx + 1}")[:60],
            "x": x,
            "y": y,
            "role": role,
            "label": str(item.get("label") or "")[:60],
            "size": size,
            "color": _clean_hex_color(item.get("color"), "#d6a84f"),
        })
    return connectors


def _parse_links_json(raw: str | None) -> list[dict[str, str]]:
    if not raw:
        return []
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=400, detail="Invalid links JSON.") from e
    if not isinstance(parsed, list):
        raise HTTPException(status_code=400, detail="Links JSON must be a list.")

    links: list[dict[str, str]] = []
    for item in parsed[:100]:
        if not isinstance(item, dict):
            continue
        url = str(item.get("url") or "").strip()[:500]
        label = str(item.get("label") or "").strip()[:100]
        if url:
            links.append({"url": url, "label": label})
    return links


def _to_icon_document(row: sqlite3.Row) -> IconDocumentOut:
    keys = row.keys()
    is_primary = bool(row["is_primary_image"]) if "is_primary_image" in keys else False
    return IconDocumentOut(
        id=row["id"],
        icon_id=row["icon_id"],
        filename=row["filename"],
        mime_type=row["mime_type"],
        size_bytes=row["size_bytes"],
        uploaded_at=row["uploaded_at"],
        folder=(row["folder"] if "folder" in keys and row["folder"] else "Documents"),
        is_primary_image=is_primary,
    )


def _sync_primary_image(
    conn: sqlite3.Connection,
    icon_id: int,
    icon_stored_path: str,
    icon_filename: str,
    icon_mime: str,
    now: str,
) -> None:
    """Mirror the icon's main PNG into an icon_files row in the 'Images' folder
    so that browsing the part's References shows the current icon image. If a
    primary row already exists, its bytes and metadata are replaced. Otherwise
    the first existing row in the 'Images' folder is promoted and overwritten;
    if none, a new row is created."""
    src_path = ICONS_DIR / icon_stored_path
    if not src_path.exists():
        return

    target = conn.execute(
        "SELECT id, stored_path FROM icon_files WHERE icon_id=? AND is_primary_image=1 LIMIT 1",
        (icon_id,),
    ).fetchone()
    if target is None:
        target = conn.execute(
            "SELECT id, stored_path FROM icon_files WHERE icon_id=? AND folder='Images' ORDER BY id LIMIT 1",
            (icon_id,),
        ).fetchone()

    ext = Path(icon_filename).suffix.lower() or ".png"
    ref_filename = f"image{ext}"
    stored_name = f"{icon_id}_{uuid.uuid4().hex[:8]}_{ref_filename}"
    abs_dest = PART_DOCS_DIR / stored_name
    PART_DOCS_DIR.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(src_path, abs_dest)
    size_bytes = abs_dest.stat().st_size

    if target is not None:
        old_path = PART_DOCS_DIR / target["stored_path"]
        conn.execute(
            """
            UPDATE icon_files
               SET filename=?, stored_path=?, mime_type=?, size_bytes=?,
                   uploaded_at=?, folder='Images', is_primary_image=1
             WHERE id=?
            """,
            (ref_filename, stored_name, icon_mime, size_bytes, now, target["id"]),
        )
        if old_path != abs_dest:
            old_path.unlink(missing_ok=True)
    else:
        conn.execute(
            """
            INSERT INTO icon_files
                (icon_id, filename, stored_path, mime_type, size_bytes, uploaded_at, folder, is_primary_image)
            VALUES (?,?,?,?,?,?,?,1)
            """,
            (icon_id, ref_filename, stored_name, icon_mime, size_bytes, now, "Images"),
        )


def _iconout_from_row(row: sqlite3.Row, documents: list[IconDocumentOut] | None = None) -> IconOut:
    return IconOut(
        id=row["id"],
        name=row["name"],
        filename=row["filename"],
        mime_type=row["mime_type"],
        uploaded_at=row["uploaded_at"],
        folder=(row["folder"] if "folder" in row.keys() and row["folder"] else "Unsorted"),
        part_number=(row["part_number"] if "part_number" in row.keys() else None),
        description=(row["description"] if "description" in row.keys() else None),
        links=_parse_links_json(row["links_json"] if "links_json" in row.keys() else None),
        connectors=_parse_connectors_json(row["connectors_json"] if "connectors_json" in row.keys() else None),
        documents=documents or [],
    )


async def _store_icon_documents(
    conn: sqlite3.Connection,
    icon_id: int,
    documents: list[UploadFile] | None,
    document_folders: list[str] | None,
    now: str,
) -> list[IconDocumentOut]:
    icon_docs: list[IconDocumentOut] = []
    for doc_idx, doc_file in enumerate(documents or []):
        if not doc_file.filename:
            continue
        doc_safe = _sanitize(doc_file.filename)
        doc_mime = _guess_mime(doc_safe)
        doc_folder = _clean_doc_folder_name(
            document_folders[doc_idx] if document_folders and doc_idx < len(document_folders) else None
        )
        doc_stored = f"{icon_id}_{uuid.uuid4().hex[:8]}_{doc_safe}"
        doc_abs = PART_DOCS_DIR / doc_stored

        bytes_written_doc = 0
        try:
            with doc_abs.open("wb") as fh:
                while chunk := await doc_file.read(1024 * 1024):
                    bytes_written_doc += len(chunk)
                    if bytes_written_doc > MAX_UPLOAD_BYTES:
                        raise HTTPException(status_code=413, detail=f"Part document exceeds {MAX_UPLOAD_BYTES // 1048576} MB limit.")
                    fh.write(chunk)
        except HTTPException:
            doc_abs.unlink(missing_ok=True)
            raise
        finally:
            await doc_file.close()

        doc_cur = conn.execute(
            "INSERT INTO icon_files (icon_id, filename, stored_path, mime_type, size_bytes, uploaded_at, folder) VALUES (?,?,?,?,?,?,?)",
            (icon_id, doc_safe, doc_stored, doc_mime, bytes_written_doc, now, doc_folder),
        )
        icon_docs.append(IconDocumentOut(
            id=int(doc_cur.lastrowid),
            icon_id=icon_id,
            filename=doc_safe,
            mime_type=doc_mime,
            size_bytes=bytes_written_doc,
            uploaded_at=now,
            folder=doc_folder,
        ))
    return icon_docs


# --- App + middleware --------------------------------------------------------
app = FastAPI(title="Offshore Systems Documentation Hub", version="0.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def _no_cache_frontend(request: Request, call_next):
    response = await call_next(request)
    if request.url.path == "/" or request.url.path.startswith("/static/"):
        response.headers["Cache-Control"] = "no-store"
    return response


@app.on_event("startup")
def _on_startup() -> None:
    init_db()
    if EDIT_PASSWORD == "offshore":
        log.warning(
            "Using default edit password 'offshore'. "
            "Set OFFSHORE_EDIT_PASSWORD env var before production use."
        )
    log.info("Database initialized.")


@app.exception_handler(HTTPException)
async def _http_exc(_: Request, exc: HTTPException) -> JSONResponse:
    return JSONResponse(status_code=exc.status_code, content={"error": exc.detail})


@app.exception_handler(RequestValidationError)
async def _val_exc(_: Request, exc: RequestValidationError) -> JSONResponse:
    parts = []
    for err in exc.errors():
        loc = ".".join(str(p) for p in err.get("loc", []) if p != "body") or "request"
        parts.append(f"{loc}: {err.get('msg', 'invalid')}")
    return JSONResponse(status_code=422, content={"error": "; ".join(parts) or "Invalid request."})


@app.exception_handler(Exception)
async def _unhandled(_: Request, exc: Exception) -> JSONResponse:
    log.exception("Unhandled error: %s", exc)
    return JSONResponse(status_code=500, content={"error": "Internal server error."})


# --- Auth -------------------------------------------------------------------
@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/auth/edit")
def check_edit_password(req: EditAuthRequest) -> dict[str, bool]:
    if req.password == EDIT_PASSWORD:
        return {"ok": True}
    raise HTTPException(status_code=401, detail="Incorrect password.")


# --- Platforms ---------------------------------------------------------------
@app.get("/api/platforms", response_model=list[PlatformOut])
def list_platforms() -> list[PlatformOut]:
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT id, name, description, created_at, logo_filename FROM platforms ORDER BY id"
        ).fetchall()
    return [
        PlatformOut(
            id=r["id"],
            name=r["name"],
            description=r["description"],
            created_at=r["created_at"],
            has_logo=bool(r["logo_filename"]),
        )
        for r in rows
    ]


@app.get("/api/platforms/{platform_id}/logo")
def get_platform_logo(platform_id: int) -> FileResponse:
    with get_conn() as conn:
        row = conn.execute(
            "SELECT logo_filename FROM platforms WHERE id=?", (platform_id,)
        ).fetchone()
    if row is None or not row["logo_filename"]:
        raise HTTPException(status_code=404, detail="No logo for this platform.")
    path = PLATFORM_LOGOS_DIR / row["logo_filename"]
    if not path.is_file():
        raise HTTPException(status_code=404, detail="Logo file missing on disk.")
    mime, _ = mimetypes.guess_type(str(path))
    return FileResponse(path, media_type=mime or "application/octet-stream")


@app.post("/api/platforms", response_model=PlatformOut, status_code=201)
def create_platform(payload: PlatformCreate) -> PlatformOut:
    now = utcnow_iso()
    empty = json.dumps(_empty_diagram_json())
    with get_conn() as conn:
        cur = conn.execute(
            "INSERT INTO platforms (name, description, created_at) VALUES (?,?,?)",
            (payload.name, payload.description, now),
        )
        new_id = cur.lastrowid
        conn.execute(
            "INSERT INTO diagrams (platform_id, drawflow_json, updated_at) VALUES (?,?,?)",
            (new_id, empty, now),
        )
    log.info("Created platform id=%s name=%r", new_id, payload.name)
    return PlatformOut(id=int(new_id), name=payload.name, description=payload.description, created_at=now)


@app.patch("/api/platforms/{platform_id}", response_model=PlatformOut)
def rename_platform(platform_id: int, payload: PlatformUpdate) -> PlatformOut:
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Name cannot be empty.")
    with get_conn() as conn:
        row = conn.execute(
            "SELECT id, name, description, created_at FROM platforms WHERE id=?",
            (platform_id,),
        ).fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail="Platform not found.")
        conn.execute("UPDATE platforms SET name=? WHERE id=?", (name, platform_id))
    return PlatformOut(id=platform_id, name=name, description=row["description"], created_at=row["created_at"])


@app.delete("/api/platforms/{platform_id}", status_code=204, response_class=Response)
def delete_platform(platform_id: int) -> Response:
    with get_conn() as conn:
        if not _platform_exists(conn, platform_id):
            raise HTTPException(status_code=404, detail="Platform not found.")
        conn.execute("DELETE FROM platforms WHERE id=?", (platform_id,))
    return Response(status_code=204)


# --- Nodes (with file counts) ------------------------------------------------
@app.get("/api/platforms/{platform_id}/nodes", response_model=list[NodeWithCount])
def list_platform_nodes(platform_id: int) -> list[NodeWithCount]:
    with get_conn() as conn:
        rows = conn.execute(
            """
            SELECT n.id, n.platform_id, COALESCE(n.diagram_ref, 'root') AS diagram_ref,
                   n.label, n.kind, n.icon,
                   COALESCE(n.port_in, 1) AS port_in,
                   COALESCE(n.port_out, 1) AS port_out,
                   COUNT(nf.id) AS file_count
            FROM nodes n
            LEFT JOIN node_files nf ON nf.node_id = n.id
            WHERE n.platform_id = ?
            GROUP BY n.id
            ORDER BY n.diagram_ref, n.label
            """,
            (platform_id,),
        ).fetchall()
    return [NodeWithCount(**dict(r)) for r in rows]


# --- Diagrams ----------------------------------------------------------------
def _platform_exists(conn: sqlite3.Connection, pid: int) -> bool:
    return conn.execute("SELECT 1 FROM platforms WHERE id=?", (pid,)).fetchone() is not None


@app.get("/api/platforms/{platform_id}/diagram", response_model=DiagramOut)
def get_diagram(platform_id: int) -> DiagramOut:
    with get_conn() as conn:
        if not _platform_exists(conn, platform_id):
            raise HTTPException(status_code=404, detail="Platform not found.")
        row = conn.execute(
            "SELECT drawflow_json, updated_at FROM diagrams WHERE platform_id=?",
            (platform_id,),
        ).fetchone()
    if row is None:
        return DiagramOut(drawflow_json=_empty_diagram_json(), updated_at=utcnow_iso())
    return DiagramOut(drawflow_json=json.loads(row["drawflow_json"]), updated_at=row["updated_at"])


def _extract_nodes(dj: dict[str, Any]) -> dict[str, dict[str, Any]]:
    try:
        diagram_version = int(dj.get("version") or 0) if isinstance(dj, dict) else 0
    except (TypeError, ValueError):
        diagram_version = 0

    if isinstance(dj, dict) and diagram_version >= 2:
        out: dict[str, dict[str, Any]] = {}
        raw_nodes = dj.get("nodes")
        if not isinstance(raw_nodes, list):
            raise HTTPException(status_code=400, detail="Diagram JSON nodes must be a list.")
        for nd in raw_nodes:
            if not isinstance(nd, dict) or not nd.get("id"):
                raise HTTPException(status_code=400, detail="Each diagram node must have an id.")
            connectors_raw = nd.get("connectors") or []
            if not isinstance(connectors_raw, list):
                connectors_raw = []
            connectors = [c for c in connectors_raw if isinstance(c, dict)]
            port_in, port_out = _connector_counts(connectors)
            nid = str(nd["id"])
            out[nid] = {
                "label": str(nd.get("label") or f"Node {nid}"),
                "kind": "equipment",
                "icon": str(nd.get("icon") or "generic"),
                "port_in": port_in,
                "port_out": port_out,
            }
        return out

    try:
        modules = dj["drawflow"]
    except (KeyError, TypeError) as e:
        raise HTTPException(status_code=400, detail="Invalid diagram JSON.") from e
    out: dict[str, dict[str, Any]] = {}
    for mod in modules.values():
        for nid, nd in ((mod or {}).get("data") or {}).items():
            d = (nd or {}).get("data") or {}
            out[str(nid)] = {
                "label":    str(d.get("label") or nd.get("name") or f"Node {nid}"),
                "kind":     d.get("kind"),
                "icon":     d.get("icon", "generic"),
                "port_in":  int(d.get("port_in", 1)),
                "port_out": int(d.get("port_out", 1)),
            }
    return out


def _sync_nodes(conn: sqlite3.Connection, pid: int, nodes: dict[str, dict[str, Any]], diagram_ref: str = "root") -> None:
    existing = {
        r["id"]
        for r in conn.execute(
            "SELECT id FROM nodes WHERE platform_id=? AND COALESCE(diagram_ref, 'root')=?",
            (pid, diagram_ref),
        ).fetchall()
    }
    for nid, info in nodes.items():
        conn.execute(
            """
            INSERT INTO nodes (id, platform_id, diagram_ref, label, kind, icon, port_in, port_out)
            VALUES (?,?,?,?,?,?,?,?)
            ON CONFLICT(id) DO UPDATE SET
                diagram_ref=excluded.diagram_ref,
                label=excluded.label, kind=excluded.kind, icon=excluded.icon,
                port_in=excluded.port_in, port_out=excluded.port_out,
                platform_id=excluded.platform_id
            """,
            (nid, pid, diagram_ref, info["label"], info["kind"], info["icon"], info["port_in"], info["port_out"]),
        )
    stale = existing - set(nodes)
    if stale:
        ph = ",".join("?" for _ in stale)
        conn.execute(
            f"DELETE FROM nodes WHERE platform_id=? AND COALESCE(diagram_ref, 'root')=? AND id IN ({ph})",
            (pid, diagram_ref, *stale),
        )


def _relabel_icon_in_diagram_json(dj: Any, icon_key: str, new_label: str) -> bool:
    """Rewrite any node referencing icon_key so its label becomes new_label.
    Returns True if anything changed. Handles both v2 ({"nodes": [...]}) and
    legacy drawflow ({"drawflow": {module: {"data": {nid: {...}}}}}) shapes."""
    if not isinstance(dj, dict):
        return False
    changed = False
    raw_nodes = dj.get("nodes")
    if isinstance(raw_nodes, list):
        for nd in raw_nodes:
            if isinstance(nd, dict) and str(nd.get("icon") or "") == icon_key:
                if nd.get("label") != new_label:
                    nd["label"] = new_label
                    changed = True
    modules = dj.get("drawflow")
    if isinstance(modules, dict):
        for mod in modules.values():
            data = (mod or {}).get("data") if isinstance(mod, dict) else None
            if not isinstance(data, dict):
                continue
            for nd in data.values():
                inner = (nd or {}).get("data") if isinstance(nd, dict) else None
                if isinstance(inner, dict) and str(inner.get("icon") or "") == icon_key:
                    if inner.get("label") != new_label:
                        inner["label"] = new_label
                        changed = True
    return changed


def _cascade_icon_rename(conn: sqlite3.Connection, icon_id: int, new_name: str, now: str) -> None:
    """Propagate an icon rename to every diagram node that references it."""
    icon_key = f"custom:{icon_id}"

    for row in conn.execute("SELECT platform_id, drawflow_json FROM diagrams").fetchall():
        try:
            dj = json.loads(row["drawflow_json"])
        except (TypeError, ValueError):
            continue
        if _relabel_icon_in_diagram_json(dj, icon_key, new_name):
            conn.execute(
                "UPDATE diagrams SET drawflow_json=?, updated_at=? WHERE platform_id=?",
                (json.dumps(dj), now, row["platform_id"]),
            )

    for row in conn.execute("SELECT id, drawflow_json FROM subdiagrams").fetchall():
        try:
            dj = json.loads(row["drawflow_json"])
        except (TypeError, ValueError):
            continue
        if _relabel_icon_in_diagram_json(dj, icon_key, new_name):
            conn.execute(
                "UPDATE subdiagrams SET drawflow_json=?, updated_at=? WHERE id=?",
                (json.dumps(dj), now, row["id"]),
            )

    conn.execute(
        "UPDATE nodes SET label=? WHERE icon=?",
        (new_name, icon_key),
    )


@app.put("/api/platforms/{platform_id}/diagram", response_model=DiagramSaveOut)
def save_diagram(platform_id: int, payload: DiagramSaveIn) -> DiagramSaveOut:
    nodes = _extract_nodes(payload.drawflow_json)
    now = utcnow_iso()
    with get_conn() as conn:
        if not _platform_exists(conn, platform_id):
            raise HTTPException(status_code=404, detail="Platform not found.")
        conn.execute(
            """
            INSERT INTO diagrams (platform_id, drawflow_json, updated_at) VALUES (?,?,?)
            ON CONFLICT(platform_id) DO UPDATE SET drawflow_json=excluded.drawflow_json, updated_at=excluded.updated_at
            """,
            (platform_id, json.dumps(payload.drawflow_json), now),
        )
        _sync_nodes(conn, platform_id, nodes)
    log.info("Saved diagram platform_id=%s nodes=%s", platform_id, len(nodes))
    return DiagramSaveOut(updated_at=now, node_count=len(nodes))


@app.get("/api/platforms/{platform_id}/subdiagrams", response_model=list[SubdiagramOut])
def list_subdiagrams(platform_id: int) -> list[SubdiagramOut]:
    with get_conn() as conn:
        if not _platform_exists(conn, platform_id):
            raise HTTPException(status_code=404, detail="Platform not found.")
        rows = conn.execute(
            """
            SELECT sd.id, sd.platform_id, sd.parent_node_id, n.label AS parent_label,
                   sd.name, sd.created_at, sd.updated_at
            FROM subdiagrams sd
            LEFT JOIN nodes n ON n.id = sd.parent_node_id
            WHERE sd.platform_id=?
            ORDER BY (sd.parent_node_id IS NOT NULL), COALESCE(n.label, ''), sd.name
            """,
            (platform_id,),
        ).fetchall()
    return [SubdiagramOut(**dict(row)) for row in rows]


@app.post("/api/platforms/{platform_id}/subdiagrams", response_model=SubdiagramOut, status_code=201)
def create_platform_subdiagram(platform_id: int, payload: SubdiagramCreate) -> SubdiagramOut:
    name = _clean_diagram_name(payload.name)
    now = utcnow_iso()
    empty = json.dumps(_empty_diagram_json())
    with get_conn() as conn:
        if not _platform_exists(conn, platform_id):
            raise HTTPException(status_code=404, detail="Platform not found.")
        cur = conn.execute(
            """
            INSERT INTO subdiagrams (platform_id, parent_node_id, name, drawflow_json, created_at, updated_at)
            VALUES (?,?,?,?,?,?)
            """,
            (platform_id, None, name, empty, now, now),
        )
        sub_id = int(cur.lastrowid)
    return SubdiagramOut(
        id=sub_id,
        platform_id=platform_id,
        parent_node_id=None,
        parent_label=None,
        name=name,
        created_at=now,
        updated_at=now,
    )


@app.patch("/api/subdiagrams/{subdiagram_id}", response_model=SubdiagramOut)
def rename_subdiagram(subdiagram_id: int, payload: SubdiagramRename) -> SubdiagramOut:
    name = _clean_diagram_name(payload.name)
    with get_conn() as conn:
        row = conn.execute(
            """
            SELECT sd.id, sd.platform_id, sd.parent_node_id, n.label AS parent_label,
                   sd.created_at, sd.updated_at
            FROM subdiagrams sd
            LEFT JOIN nodes n ON n.id = sd.parent_node_id
            WHERE sd.id=?
            """,
            (subdiagram_id,),
        ).fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail="Sub diagram not found.")
        conn.execute("UPDATE subdiagrams SET name=?, updated_at=? WHERE id=?", (name, utcnow_iso(), subdiagram_id))
    return SubdiagramOut(
        id=subdiagram_id,
        platform_id=int(row["platform_id"]),
        parent_node_id=row["parent_node_id"],
        parent_label=row["parent_label"],
        name=name,
        created_at=row["created_at"],
        updated_at=utcnow_iso(),
    )


@app.post("/api/platforms/{platform_id}/nodes/{node_id}/subdiagrams", response_model=SubdiagramOut, status_code=201)
def create_subdiagram(platform_id: int, node_id: str, payload: SubdiagramCreate) -> SubdiagramOut:
    name = _clean_diagram_name(payload.name)
    now = utcnow_iso()
    empty = json.dumps(_empty_diagram_json())
    with get_conn() as conn:
        if not _platform_exists(conn, platform_id):
            raise HTTPException(status_code=404, detail="Platform not found.")
        node = conn.execute(
            "SELECT id, label FROM nodes WHERE id=? AND platform_id=?",
            (node_id, platform_id),
        ).fetchone()
        if node is None:
            raise HTTPException(status_code=404, detail="Node not found. Save the diagram first.")
        cur = conn.execute(
            """
            INSERT INTO subdiagrams (platform_id, parent_node_id, name, drawflow_json, created_at, updated_at)
            VALUES (?,?,?,?,?,?)
            """,
            (platform_id, node_id, name, empty, now, now),
        )
        sub_id = int(cur.lastrowid)
    return SubdiagramOut(
        id=sub_id,
        platform_id=platform_id,
        parent_node_id=node_id,
        parent_label=node["label"],
        name=name,
        created_at=now,
        updated_at=now,
    )


@app.get("/api/subdiagrams/{subdiagram_id}", response_model=DiagramOut)
def get_subdiagram(subdiagram_id: int) -> DiagramOut:
    with get_conn() as conn:
        row = conn.execute(
            "SELECT drawflow_json, updated_at FROM subdiagrams WHERE id=?",
            (subdiagram_id,),
        ).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Sub diagram not found.")
    return DiagramOut(drawflow_json=json.loads(row["drawflow_json"]), updated_at=row["updated_at"])


@app.put("/api/subdiagrams/{subdiagram_id}/diagram", response_model=DiagramSaveOut)
def save_subdiagram(subdiagram_id: int, payload: DiagramSaveIn) -> DiagramSaveOut:
    nodes = _extract_nodes(payload.drawflow_json)
    now = utcnow_iso()
    with get_conn() as conn:
        sub = conn.execute(
            "SELECT id, platform_id FROM subdiagrams WHERE id=?",
            (subdiagram_id,),
        ).fetchone()
        if sub is None:
            raise HTTPException(status_code=404, detail="Sub diagram not found.")
        conn.execute(
            "UPDATE subdiagrams SET drawflow_json=?, updated_at=? WHERE id=?",
            (json.dumps(payload.drawflow_json), now, subdiagram_id),
        )
        _sync_nodes(conn, int(sub["platform_id"]), nodes, f"sub:{subdiagram_id}")
    log.info("Saved subdiagram id=%s nodes=%s", subdiagram_id, len(nodes))
    return DiagramSaveOut(updated_at=now, node_count=len(nodes))


@app.delete("/api/subdiagrams/{subdiagram_id}", status_code=204, response_class=Response)
def delete_subdiagram(subdiagram_id: int) -> Response:
    with get_conn() as conn:
        sub = conn.execute(
            "SELECT id, platform_id FROM subdiagrams WHERE id=?",
            (subdiagram_id,),
        ).fetchone()
        if sub is None:
            raise HTTPException(status_code=404, detail="Sub diagram not found.")
        conn.execute(
            "DELETE FROM nodes WHERE platform_id=? AND COALESCE(diagram_ref, 'root')=?",
            (sub["platform_id"], f"sub:{subdiagram_id}"),
        )
        conn.execute("DELETE FROM subdiagrams WHERE id=?", (subdiagram_id,))
    return Response(status_code=204)


# --- Node files --------------------------------------------------------------
def _node_exists(conn: sqlite3.Connection, node_id: str) -> bool:
    return conn.execute("SELECT 1 FROM nodes WHERE id=?", (node_id,)).fetchone() is not None


def _to_filemeta(row: sqlite3.Row) -> FileMeta:
    return FileMeta(
        id=row["id"], node_id=row["node_id"], filename=row["filename"],
        mime_type=row["mime_type"], size_bytes=row["size_bytes"],
        uploaded_at=row["uploaded_at"],
        category=row["category"] if "category" in row.keys() else None,
        notes=row["notes"] if "notes" in row.keys() else None,
    )


@app.get("/api/nodes/{node_id}/files", response_model=list[FileMeta])
def list_node_files(node_id: str) -> list[FileMeta]:
    with get_conn() as conn:
        if not _node_exists(conn, node_id):
            raise HTTPException(status_code=404, detail="Node not found.")
        rows = conn.execute(
            """SELECT id, node_id, filename, mime_type, size_bytes, uploaded_at, category, notes
               FROM node_files WHERE node_id=? ORDER BY category NULLS LAST, uploaded_at DESC""",
            (node_id,),
        ).fetchall()
    return [_to_filemeta(r) for r in rows]


@app.post("/api/nodes/{node_id}/files", response_model=FileMeta, status_code=201)
async def upload_node_file(
    node_id: str,
    file: UploadFile = File(...),
    category: str | None = Form(None),
) -> FileMeta:
    if not file.filename:
        raise HTTPException(status_code=400, detail="Missing filename.")
    safe_name = _sanitize(file.filename)
    mime = _guess_mime(safe_name)

    with get_conn() as conn:
        if not _node_exists(conn, node_id):
            raise HTTPException(status_code=404, detail="Node not found.")

    node_dir = FILES_DIR / _sanitize(node_id)
    node_dir.mkdir(parents=True, exist_ok=True)
    abs_path = node_dir / f"{uuid.uuid4().hex[:8]}_{safe_name}"
    rel_path = abs_path.relative_to(FILES_DIR).as_posix()

    bytes_written = 0
    try:
        with abs_path.open("wb") as fh:
            while chunk := await file.read(1024 * 1024):
                bytes_written += len(chunk)
                if bytes_written > MAX_UPLOAD_BYTES:
                    raise HTTPException(status_code=413, detail=f"File exceeds {MAX_UPLOAD_BYTES // 1048576} MB limit.")
                fh.write(chunk)
    except HTTPException:
        abs_path.unlink(missing_ok=True)
        raise
    except Exception:
        abs_path.unlink(missing_ok=True)
        raise
    finally:
        await file.close()

    cat = (category.strip() or None) if category else None
    now = utcnow_iso()
    with get_conn() as conn:
        cur = conn.execute(
            "INSERT INTO node_files (node_id, filename, stored_path, mime_type, size_bytes, uploaded_at, category, notes) VALUES (?,?,?,?,?,?,?,NULL)",
            (node_id, safe_name, rel_path, mime, bytes_written, now, cat),
        )
        file_id = int(cur.lastrowid)  # type: ignore[arg-type]

    log.info("Uploaded file id=%s node=%s name=%r size=%s", file_id, node_id, safe_name, bytes_written)
    return FileMeta(id=file_id, node_id=node_id, filename=safe_name, mime_type=mime,
                    size_bytes=bytes_written, uploaded_at=now, category=cat)


def _file_row(file_id: int) -> sqlite3.Row:
    with get_conn() as conn:
        row = conn.execute(
            "SELECT id, node_id, filename, stored_path, mime_type, size_bytes, uploaded_at, category, notes FROM node_files WHERE id=?",
            (file_id,),
        ).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="File not found.")
    return row


@app.get("/api/files/{file_id}/meta", response_model=FileMeta)
def get_file_meta(file_id: int) -> FileMeta:
    return _to_filemeta(_file_row(file_id))


@app.get("/api/files/{file_id}")
def stream_file(file_id: int) -> FileResponse:
    row = _file_row(file_id)
    path = FILES_DIR / row["stored_path"]
    if not path.exists():
        raise HTTPException(status_code=410, detail="File missing on disk.")
    return FileResponse(path=str(path), media_type=row["mime_type"], filename=row["filename"])


@app.patch("/api/files/{file_id}/notes", response_model=FileMeta)
def update_file_notes(file_id: int, payload: FileNotesUpdate) -> FileMeta:
    row = _file_row(file_id)
    notes = payload.notes.strip() if payload.notes else None
    with get_conn() as conn:
        conn.execute("UPDATE node_files SET notes=? WHERE id=?", (notes, file_id))
    return FileMeta(
        id=file_id, node_id=row["node_id"], filename=row["filename"],
        mime_type=row["mime_type"], size_bytes=row["size_bytes"],
        uploaded_at=row["uploaded_at"], category=row["category"], notes=notes,
    )


@app.delete("/api/files/{file_id}", status_code=204, response_class=Response)
def delete_file(file_id: int) -> Response:
    row = _file_row(file_id)
    with get_conn() as conn:
        conn.execute("DELETE FROM node_files WHERE id=?", (file_id,))
    (FILES_DIR / row["stored_path"]).unlink(missing_ok=True)
    log.info("Deleted file id=%s", file_id)
    return Response(status_code=204)


# --- Custom part folders -----------------------------------------------------
@app.get("/api/icon-folders", response_model=list[IconFolderOut])
def list_icon_folders() -> list[IconFolderOut]:
    with get_conn() as conn:
        folder_rows = conn.execute(
            "SELECT name, created_at FROM icon_folders ORDER BY lower(name)"
        ).fetchall()
        count_rows = conn.execute(
            "SELECT COALESCE(NULLIF(folder, ''), 'Unsorted') AS name, COUNT(*) AS part_count FROM icons GROUP BY COALESCE(NULLIF(folder, ''), 'Unsorted')"
        ).fetchall()

    counts = {row["name"]: int(row["part_count"]) for row in count_rows}
    folders: dict[str, IconFolderOut] = {
        "Unsorted": IconFolderOut(name="Unsorted", created_at=None, part_count=counts.get("Unsorted", 0)),
    }

    for row in folder_rows:
        name = row["name"] or "Unsorted"
        folders[name] = IconFolderOut(
            name=name,
            created_at=row["created_at"],
            part_count=counts.get(name, 0),
        )

    for name, count in counts.items():
        folders.setdefault(name, IconFolderOut(name=name, created_at=None, part_count=count))

    return sorted(
        folders.values(),
        key=lambda folder: (folder.name != "Unsorted", folder.name.lower()),
    )


@app.post("/api/icon-folders", response_model=IconFolderOut, status_code=201)
def create_icon_folder(payload: IconFolderCreate) -> IconFolderOut:
    name = _clean_folder_name(payload.name)
    now = utcnow_iso()
    with get_conn() as conn:
        conn.execute(
            "INSERT OR IGNORE INTO icon_folders (name, created_at) VALUES (?, ?)",
            (name, now),
        )
        row = conn.execute(
            "SELECT name, created_at FROM icon_folders WHERE name=?", (name,)
        ).fetchone()
        count = conn.execute(
            "SELECT COUNT(*) AS n FROM icons WHERE COALESCE(NULLIF(folder, ''), 'Unsorted')=?",
            (name,),
        ).fetchone()["n"]
    return IconFolderOut(name=row["name"], created_at=row["created_at"], part_count=count)


# --- Custom icons ------------------------------------------------------------
@app.get("/api/icons", response_model=list[IconOut])
def list_icons() -> list[IconOut]:
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT id, name, filename, mime_type, uploaded_at, connectors_json, folder, description, part_number, links_json FROM icons ORDER BY folder, name"
        ).fetchall()
        doc_rows = conn.execute(
            "SELECT id, icon_id, filename, mime_type, size_bytes, uploaded_at, folder, is_primary_image FROM icon_files ORDER BY folder, filename"
        ).fetchall()

    docs_by_icon: dict[int, list[IconDocumentOut]] = {}
    for doc in doc_rows:
        docs_by_icon.setdefault(int(doc["icon_id"]), []).append(_to_icon_document(doc))
    return [_iconout_from_row(r, docs_by_icon.get(int(r["id"]), [])) for r in rows]


@app.post("/api/icons", response_model=IconOut, status_code=201)
async def upload_icon(
    name: str = Form(...),
    file: UploadFile = File(...),
    connectors_json: str | None = Form(None),
    folder: str | None = Form(None),
    part_number: str | None = Form(None),
    description: str | None = Form(None),
    links_json: str | None = Form(None),
    documents: list[UploadFile] | None = File(None),
    document_folders: list[str] | None = Form(None),
) -> IconOut:
    if not file.filename:
        raise HTTPException(status_code=400, detail="Missing filename.")
    safe_name = _sanitize(file.filename)
    ext = Path(safe_name).suffix.lower()
    if ext not in ICON_ALLOWED_EXTS:
        raise HTTPException(status_code=415, detail="Icon must be a PNG, JPG, WEBP, or SVG file.")
    name_clean = name.strip()[:80]
    if not name_clean:
        raise HTTPException(status_code=400, detail="Icon name is required.")
    mime = ICON_EXT_MIME[ext]
    connectors = _parse_connectors_json(connectors_json)
    folder_clean = _clean_folder_name(folder or "Unsorted")
    part_number_clean = (part_number or "").strip()[:120] or None
    description_clean = (description or "").strip()[:5000] or None
    links = _parse_links_json(links_json)

    stored_name = f"{uuid.uuid4().hex[:8]}_{safe_name}"
    abs_path = ICONS_DIR / stored_name
    rel_path = stored_name

    bytes_written = 0
    try:
        with abs_path.open("wb") as fh:
            while chunk := await file.read(256 * 1024):
                bytes_written += len(chunk)
                if bytes_written > MAX_ICON_BYTES:
                    raise HTTPException(status_code=413, detail="Icon exceeds 5 MB limit.")
                fh.write(chunk)
    except HTTPException:
        abs_path.unlink(missing_ok=True)
        raise
    finally:
        await file.close()

    now = utcnow_iso()
    with get_conn() as conn:
        conn.execute(
            "INSERT OR IGNORE INTO icon_folders (name, created_at) VALUES (?, ?)",
            (folder_clean, now),
        )
        cur = conn.execute(
            "INSERT INTO icons (name, filename, stored_path, mime_type, uploaded_at, connectors_json, folder, description, part_number, links_json) VALUES (?,?,?,?,?,?,?,?,?,?)",
            (name_clean, safe_name, rel_path, mime, now, json.dumps(connectors), folder_clean, description_clean, part_number_clean, json.dumps(links)),
        )
        icon_id = int(cur.lastrowid)  # type: ignore[arg-type]
        await _store_icon_documents(conn, icon_id, documents, document_folders, now)
        _sync_primary_image(conn, icon_id, rel_path, safe_name, mime, now)
        doc_rows = conn.execute(
            "SELECT id, icon_id, filename, mime_type, size_bytes, uploaded_at, folder, is_primary_image FROM icon_files WHERE icon_id=? ORDER BY folder, filename",
            (icon_id,),
        ).fetchall()
        icon_docs = [_to_icon_document(r) for r in doc_rows]

    log.info("Uploaded icon id=%s name=%r", icon_id, name_clean)
    return IconOut(
        id=icon_id,
        name=name_clean,
        filename=safe_name,
        mime_type=mime,
        uploaded_at=now,
        folder=folder_clean,
        part_number=part_number_clean,
        description=description_clean,
        links=links,
        connectors=connectors,
        documents=icon_docs,
    )


@app.put("/api/icons/{icon_id}", response_model=IconOut)
async def update_icon(
    icon_id: int,
    name: str = Form(...),
    file: UploadFile | None = File(None),
    connectors_json: str | None = Form(None),
    folder: str | None = Form(None),
    part_number: str | None = Form(None),
    description: str | None = Form(None),
    links_json: str | None = Form(None),
    documents: list[UploadFile] | None = File(None),
    document_folders: list[str] | None = Form(None),
) -> IconOut:
    name_clean = name.strip()[:80]
    if not name_clean:
        raise HTTPException(status_code=400, detail="Icon name is required.")
    folder_clean = _clean_folder_name(folder or "Unsorted")
    part_number_clean = (part_number or "").strip()[:120] or None
    description_clean = (description or "").strip()[:5000] or None
    links = _parse_links_json(links_json)

    with get_conn() as conn:
        existing = conn.execute(
            "SELECT id, name, filename, stored_path, mime_type, uploaded_at, connectors_json FROM icons WHERE id=?",
            (icon_id,),
        ).fetchone()
    if existing is None:
        raise HTTPException(status_code=404, detail="Icon not found.")
    old_name = existing["name"]

    connectors = (
        _parse_connectors_json(connectors_json)
        if connectors_json is not None
        else _parse_connectors_json(existing["connectors_json"])
    )
    safe_name = existing["filename"]
    rel_path = existing["stored_path"]
    mime = existing["mime_type"]
    old_path: Path | None = None

    if file and file.filename:
        next_safe_name = _sanitize(file.filename)
        ext = Path(next_safe_name).suffix.lower()
        if ext not in ICON_ALLOWED_EXTS:
            raise HTTPException(status_code=415, detail="Icon must be a PNG, JPG, WEBP, or SVG file.")
        next_mime = ICON_EXT_MIME[ext]
        stored_name = f"{uuid.uuid4().hex[:8]}_{next_safe_name}"
        abs_path = ICONS_DIR / stored_name
        bytes_written = 0
        try:
            with abs_path.open("wb") as fh:
                while chunk := await file.read(256 * 1024):
                    bytes_written += len(chunk)
                    if bytes_written > MAX_ICON_BYTES:
                        raise HTTPException(status_code=413, detail="Icon exceeds 5 MB limit.")
                    fh.write(chunk)
        except HTTPException:
            abs_path.unlink(missing_ok=True)
            raise
        finally:
            await file.close()
        old_path = ICONS_DIR / existing["stored_path"]
        safe_name = next_safe_name
        rel_path = stored_name
        mime = next_mime

    now = utcnow_iso()
    with get_conn() as conn:
        conn.execute(
            "INSERT OR IGNORE INTO icon_folders (name, created_at) VALUES (?, ?)",
            (folder_clean, now),
        )
        conn.execute(
            """
            UPDATE icons
               SET name=?, filename=?, stored_path=?, mime_type=?, connectors_json=?,
                   folder=?, description=?, part_number=?, links_json=?
             WHERE id=?
            """,
            (
                name_clean, safe_name, rel_path, mime, json.dumps(connectors),
                folder_clean, description_clean, part_number_clean, json.dumps(links), icon_id,
            ),
        )
        new_docs = await _store_icon_documents(conn, icon_id, documents, document_folders, now)
        if name_clean != old_name:
            _cascade_icon_rename(conn, icon_id, name_clean, now)
        _sync_primary_image(conn, icon_id, rel_path, safe_name, mime, now)
        doc_rows = conn.execute(
            "SELECT id, icon_id, filename, mime_type, size_bytes, uploaded_at, folder, is_primary_image FROM icon_files WHERE icon_id=? ORDER BY folder, filename",
            (icon_id,),
        ).fetchall()

    if old_path:
        old_path.unlink(missing_ok=True)

    icon_docs = [_to_icon_document(row) for row in doc_rows]
    if not icon_docs:
        icon_docs = new_docs
    return IconOut(
        id=icon_id,
        name=name_clean,
        filename=safe_name,
        mime_type=mime,
        uploaded_at=existing["uploaded_at"],
        folder=folder_clean,
        part_number=part_number_clean,
        description=description_clean,
        links=links,
        connectors=connectors,
        documents=icon_docs,
    )


@app.get("/api/icons/{icon_id}")
def serve_icon(icon_id: int) -> FileResponse:
    with get_conn() as conn:
        row = conn.execute(
            "SELECT stored_path, mime_type, filename FROM icons WHERE id=?", (icon_id,)
        ).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Icon not found.")
    path = ICONS_DIR / row["stored_path"]
    if not path.exists():
        raise HTTPException(status_code=410, detail="Icon missing on disk.")
    return FileResponse(path=str(path), media_type=row["mime_type"], filename=row["filename"])


def _icon_file_row(file_id: int) -> sqlite3.Row:
    with get_conn() as conn:
        row = conn.execute(
            "SELECT id, icon_id, filename, stored_path, mime_type, size_bytes, uploaded_at, folder FROM icon_files WHERE id=?",
            (file_id,),
        ).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Part document not found.")
    return row


@app.get("/api/icon-documents/{file_id}")
def stream_icon_document(file_id: int) -> FileResponse:
    row = _icon_file_row(file_id)
    path = PART_DOCS_DIR / row["stored_path"]
    if not path.exists():
        raise HTTPException(status_code=410, detail="Part document missing on disk.")
    return FileResponse(path=str(path), media_type=row["mime_type"], filename=row["filename"])


@app.delete("/api/icon-documents/{file_id}", status_code=204, response_class=Response)
def delete_icon_document(file_id: int) -> Response:
    row = _icon_file_row(file_id)
    with get_conn() as conn:
        conn.execute("DELETE FROM icon_files WHERE id=?", (file_id,))
    (PART_DOCS_DIR / row["stored_path"]).unlink(missing_ok=True)
    return Response(status_code=204)


@app.delete("/api/icons/{icon_id}", status_code=204, response_class=Response)
def delete_icon(icon_id: int) -> Response:
    with get_conn() as conn:
        row = conn.execute("SELECT stored_path FROM icons WHERE id=?", (icon_id,)).fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail="Icon not found.")
        doc_rows = conn.execute("SELECT stored_path FROM icon_files WHERE icon_id=?", (icon_id,)).fetchall()
        conn.execute("DELETE FROM icons WHERE id=?", (icon_id,))
    (ICONS_DIR / row["stored_path"]).unlink(missing_ok=True)
    for doc_row in doc_rows:
        (PART_DOCS_DIR / doc_row["stored_path"]).unlink(missing_ok=True)
    return Response(status_code=204)


# --- Project file explorer ---------------------------------------------------

def _build_folder_tree(
    all_folders: list[dict],
    all_files: list[dict],
    parent_id: int | None = None,
) -> list[ProjectFolderOut]:
    result = []
    for f in all_folders:
        if f["parent_id"] == parent_id:
            folder_files = [
                ProjectFileOut(**fi) for fi in all_files if fi["folder_id"] == f["id"]
            ]
            result.append(ProjectFolderOut(
                id=f["id"],
                name=f["name"],
                parent_id=f["parent_id"],
                created_at=f["created_at"],
                children=_build_folder_tree(all_folders, all_files, f["id"]),
                files=folder_files,
            ))
    return result


@app.get("/api/platforms/{platform_id}/project-tree", response_model=ProjectTreeOut)
def get_project_tree(platform_id: int, diagram_ref: str = "root") -> ProjectTreeOut:
    with get_conn() as conn:
        folders = [dict(r) for r in conn.execute(
            "SELECT id, name, parent_id, created_at FROM project_folders "
            "WHERE platform_id=? AND diagram_ref=? ORDER BY name",
            (platform_id, diagram_ref),
        ).fetchall()]
        files = [dict(r) for r in conn.execute(
            "SELECT id, folder_id, filename, mime_type, size_bytes, uploaded_at "
            "FROM project_files WHERE platform_id=? AND diagram_ref=? ORDER BY filename",
            (platform_id, diagram_ref),
        ).fetchall()]
    root_files = [ProjectFileOut(**fi) for fi in files if fi["folder_id"] is None]
    return ProjectTreeOut(
        folders=_build_folder_tree(folders, files),
        files=root_files,
    )


@app.post("/api/platforms/{platform_id}/project-folders", response_model=ProjectFolderOut, status_code=201)
def create_project_folder(platform_id: int, payload: ProjectFolderCreate) -> ProjectFolderOut:
    name = re.sub(r"\s+", " ", payload.name.strip())[:80]
    if not name:
        raise HTTPException(status_code=400, detail="Folder name required.")
    now = utcnow_iso()
    with get_conn() as conn:
        cur = conn.execute(
            "INSERT INTO project_folders (platform_id, diagram_ref, parent_id, name, created_at) "
            "VALUES (?,?,?,?,?)",
            (platform_id, payload.diagram_ref, payload.parent_id, name, now),
        )
        fid = cur.lastrowid
    return ProjectFolderOut(id=fid, name=name, parent_id=payload.parent_id, created_at=now)


@app.patch("/api/project-folders/{folder_id}", response_model=ProjectFolderOut)
def rename_project_folder(folder_id: int, payload: ProjectFolderRename) -> ProjectFolderOut:
    name = re.sub(r"\s+", " ", payload.name.strip())[:80]
    if not name:
        raise HTTPException(status_code=400, detail="Folder name required.")
    with get_conn() as conn:
        row = conn.execute("SELECT * FROM project_folders WHERE id=?", (folder_id,)).fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail="Folder not found.")
        conn.execute("UPDATE project_folders SET name=? WHERE id=?", (name, folder_id))
    return ProjectFolderOut(id=folder_id, name=name, parent_id=row["parent_id"], created_at=row["created_at"])


@app.delete("/api/project-folders/{folder_id}", status_code=204, response_class=Response)
def delete_project_folder(folder_id: int) -> Response:
    with get_conn() as conn:
        file_rows = conn.execute(
            "SELECT stored_path FROM project_files WHERE folder_id=?", (folder_id,)
        ).fetchall()
        conn.execute("DELETE FROM project_folders WHERE id=?", (folder_id,))
    for r in file_rows:
        (PROJECT_FILES_DIR / r["stored_path"]).unlink(missing_ok=True)
    return Response(status_code=204)


@app.post("/api/platforms/{platform_id}/project-files", response_model=ProjectFileOut, status_code=201)
async def upload_project_file(
    platform_id: int,
    file: UploadFile = File(...),
    folder_id: int | None = Form(None),
    diagram_ref: str = Form("root"),
) -> ProjectFileOut:
    PROJECT_FILES_DIR.mkdir(parents=True, exist_ok=True)
    data = await file.read()
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="File too large (max 50 MB).")
    safe = _sanitize(file.filename or "upload")
    stored = f"{uuid.uuid4().hex}_{safe}"
    (PROJECT_FILES_DIR / stored).write_bytes(data)
    mime = _guess_mime(file.filename or "")
    now = utcnow_iso()
    with get_conn() as conn:
        cur = conn.execute(
            "INSERT INTO project_files (platform_id, diagram_ref, folder_id, filename, stored_path, mime_type, size_bytes, uploaded_at) "
            "VALUES (?,?,?,?,?,?,?,?)",
            (platform_id, diagram_ref, folder_id, safe, stored, mime, len(data), now),
        )
        fid = cur.lastrowid
    return ProjectFileOut(id=fid, folder_id=folder_id, filename=safe, mime_type=mime, size_bytes=len(data), uploaded_at=now)


@app.get("/api/project-files/{file_id}")
def stream_project_file(file_id: int) -> FileResponse:
    with get_conn() as conn:
        row = conn.execute("SELECT * FROM project_files WHERE id=?", (file_id,)).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="File not found.")
    path = PROJECT_FILES_DIR / row["stored_path"]
    if not path.exists():
        raise HTTPException(status_code=404, detail="File missing on disk.")
    return FileResponse(str(path), media_type=row["mime_type"], filename=row["filename"])


@app.delete("/api/project-files/{file_id}", status_code=204, response_class=Response)
def delete_project_file(file_id: int) -> Response:
    with get_conn() as conn:
        row = conn.execute("SELECT stored_path FROM project_files WHERE id=?", (file_id,)).fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail="File not found.")
        conn.execute("DELETE FROM project_files WHERE id=?", (file_id,))
    (PROJECT_FILES_DIR / row["stored_path"]).unlink(missing_ok=True)
    return Response(status_code=204)


# --- Frontend ----------------------------------------------------------------
FRONTEND_DIR = PROJECT_ROOT / "frontend"


@app.get("/", include_in_schema=False)
def index() -> FileResponse:
    return FileResponse(FRONTEND_DIR / "index.html", media_type="text/html")


app.mount("/static", StaticFiles(directory=str(FRONTEND_DIR)), name="static")
