"""Import the local Phoenix Contact Parts Library into offshore-docs.

The importer is intentionally local and idempotent. It reads the sibling
``Parts Library`` folder, copies part images/reference files into the app data
store, and upserts custom diagram parts by Phoenix part number.
"""
from __future__ import annotations

import csv
import html
import json
import mimetypes
import re
import shutil
import sqlite3
from pathlib import Path
from typing import Iterable

from datetime import datetime

from db import DB_PATH, ICONS_DIR, PART_DOCS_DIR, PROJECT_ROOT, get_conn, utcnow_iso


LIBRARY_ROOT = PROJECT_ROOT.parent / "Parts Library"
ICON_SUBDIR = "parts_library"
DOC_SUBDIR = "parts_library"
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".svg"}

TEXT_FIXES = {
    "â€”": "-",
    "â€“": "-",
    "â€‘": "-",
    "â€": '"',
    "Ã—": "x",
    "Â²": "^2",
    "Â³": "^3",
    "Â°": " deg",
    "Ã¸": "o",
    "Ã¤": "a",
    "Ã¶": "o",
    "Ã¼": "u",
    "ÃŸ": "ss",
    "\u00a0": " ",
}


def clean_text(value: str | None) -> str:
    text = str(value or "")
    for bad, good in TEXT_FIXES.items():
        text = text.replace(bad, good)
    return re.sub(r"[ \t]+", " ", text).strip()


def safe_name(name: str, fallback: str = "part") -> str:
    cleaned = re.sub(r"[^A-Za-z0-9._-]+", "_", clean_text(name)).strip("._")
    return (cleaned or fallback)[:120]


def match_key(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", clean_text(value).lower().replace("+", "plus"))


def read_text(path: Path) -> str:
    if not path.exists():
        return ""
    return clean_text(path.read_text(encoding="utf-8", errors="replace"))


def find_part_dir(part_number: str) -> Path | None:
    target_key = match_key(part_number)
    matches = sorted(
        path for path in LIBRARY_ROOT.iterdir()
        if path.is_dir() and (
            part_number in path.name
            or target_key in match_key(path.name)
        )
    )
    return matches[0] if matches else None


def read_index() -> list[dict[str, str]]:
    index_path = LIBRARY_ROOT / "parts_index.csv"
    with index_path.open("r", encoding="utf-8-sig", newline="") as fh:
        rows = []
        for row in csv.DictReader(fh):
            rows.append({key: clean_text(value) for key, value in row.items()})
        return rows


def parse_info_fields(info: str) -> dict[str, str]:
    fields: dict[str, str] = {}
    for line in info.splitlines():
        if ":" not in line:
            continue
        key, value = line.split(":", 1)
        key = clean_text(key).lower()
        value = clean_text(value)
        if key and value:
            fields[key] = value
    return fields


def parse_section(info: str, heading: str) -> str:
    lines = info.splitlines()
    start = None
    for idx, line in enumerate(lines):
        if clean_text(line).upper() == heading.upper():
            start = idx + 1
            break
    if start is None:
        return ""

    collected: list[str] = []
    skipped_rule = False
    for line in lines[start:]:
        stripped = clean_text(line)
        if set(stripped) <= {"-"}:
            skipped_rule = True
            continue
        if stripped and stripped.isupper() and len(stripped) > 4 and skipped_rule:
            break
        skipped_rule = False
        if stripped:
            collected.append(stripped)
    return " ".join(collected)


def parse_info_links(info: str) -> list[dict[str, str]]:
    links: list[dict[str, str]] = []
    for line in info.splitlines():
        match = re.match(r"^([^:]+):\s*(https?://\S+)$", clean_text(line))
        if match:
            links.append({"label": match.group(1).strip(), "url": match.group(2).strip()})
    return links


def dedupe_links(links: Iterable[dict[str, str]]) -> list[dict[str, str]]:
    seen: set[str] = set()
    result: list[dict[str, str]] = []
    for link in links:
        url = clean_text(link.get("url"))
        label = clean_text(link.get("label")) or url
        if not url or url in seen:
            continue
        seen.add(url)
        result.append({"url": url[:500], "label": label[:100]})
    return result


def description_from(row: dict[str, str], info: str) -> str:
    description = parse_section(info, "DESCRIPTION")
    specs = parse_section(info, "KEY SPECIFICATIONS")
    used_in = clean_text(row.get("used_in"))
    pieces = []
    if description:
        pieces.append(description)
    if specs:
        pieces.append(f"Key specs: {specs}")
    if used_in:
        pieces.append(f"Used in project(s): {used_in}.")
    return " ".join(pieces)[:5000]


def connectors_for(row: dict[str, str]) -> list[dict[str, object]]:
    category = clean_text(row.get("category")).lower()
    if any(word in category for word in ["terminal", "breaker", "surge", "fuse"]):
        return [
            {"id": "top", "x": 0.5, "y": 0, "role": "neutral", "label": "Top", "size": 5, "color": "#3d9b63"},
            {"id": "bottom", "x": 0.5, "y": 1, "role": "neutral", "label": "Bottom", "size": 5, "color": "#3d9b63"},
        ]
    return [
        {"id": "left", "x": 0, "y": 0.5, "role": "neutral", "label": "Left", "size": 5, "color": "#3d9b63"},
        {"id": "right", "x": 1, "y": 0.5, "role": "neutral", "label": "Right", "size": 5, "color": "#3d9b63"},
        {"id": "top", "x": 0.5, "y": 0, "role": "neutral", "label": "Top", "size": 5, "color": "#3d9b63"},
        {"id": "bottom", "x": 0.5, "y": 1, "role": "neutral", "label": "Bottom", "size": 5, "color": "#3d9b63"},
    ]


def write_placeholder_icon(part_number: str, name: str, category: str) -> tuple[str, str, str]:
    icon_dir = ICONS_DIR / ICON_SUBDIR
    icon_dir.mkdir(parents=True, exist_ok=True)
    filename = f"{part_number}_placeholder.svg"
    rel_path = f"{ICON_SUBDIR}/{filename}"
    title = html.escape(name[:32])
    subtitle = html.escape(part_number)
    detail = html.escape(category[:38])
    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 160">
  <rect x="8" y="8" width="204" height="144" rx="10" fill="#f8fafc" stroke="#376b7a" stroke-width="6"/>
  <rect x="28" y="28" width="164" height="18" rx="4" fill="#376b7a"/>
  <rect x="28" y="114" width="164" height="18" rx="4" fill="#376b7a"/>
  <text x="110" y="74" text-anchor="middle" font-family="Arial, sans-serif" font-size="20" font-weight="700" fill="#17242a">{title}</text>
  <text x="110" y="98" text-anchor="middle" font-family="Arial, sans-serif" font-size="17" fill="#4b5563">{subtitle}</text>
  <text x="110" y="144" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" fill="#64748b">{detail}</text>
</svg>
"""
    (ICONS_DIR / rel_path).write_text(svg, encoding="utf-8")
    return filename, rel_path, "image/svg+xml"


def image_candidates(part_dir: Path | None) -> list[Path]:
    if part_dir is None:
        return []
    return [
        path for path in part_dir.iterdir()
        if path.is_file() and path.suffix.lower() in IMAGE_EXTENSIONS
    ]


def best_icon_image(part_dir: Path | None) -> Path | None:
    candidates = image_candidates(part_dir)
    if not candidates:
        return None

    def score(path: Path) -> tuple[int, int, int, str]:
        name = path.name.lower()
        is_placeholder = "placeholder" in name
        is_named_image = path.stem.lower() == "image"
        is_raster = path.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp"}
        try:
            size = path.stat().st_size
        except OSError:
            size = 0
        return (
            0 if is_placeholder else 1,
            1 if is_raster else 0,
            size if not is_named_image else size - 1,
            path.name.lower(),
        )

    return max(candidates, key=score)


def copy_icon(part_dir: Path | None, part_number: str, name: str, category: str) -> tuple[str, str, str]:
    image = best_icon_image(part_dir)
    if image is None:
        return write_placeholder_icon(part_number, name, category)

    icon_dir = ICONS_DIR / ICON_SUBDIR
    icon_dir.mkdir(parents=True, exist_ok=True)
    filename = safe_name(f"{part_number}_{image.name}")
    rel_path = f"{ICON_SUBDIR}/{filename}"
    target = ICONS_DIR / rel_path
    target.unlink(missing_ok=True)
    shutil.copy2(image, target)
    mime = mimetypes.guess_type(filename)[0] or "image/jpeg"
    return image.name, rel_path, mime


def reference_files(part_dir: Path | None) -> list[tuple[Path, str]]:
    if part_dir is None:
        return []
    files: list[tuple[str, str]] = [
        ("README.md", "Summary"),
        ("info.txt", "Manifest"),
        ("links.html", "Links"),
        ("datasheet.txt", "Datasheets"),
    ]
    refs = []
    for filename, folder in files:
        path = part_dir / filename
        if path.exists() and path.is_file():
            refs.append((path, folder))
    for path in sorted(image_candidates(part_dir), key=lambda item: item.name.lower()):
        refs.append((path, "Images"))
    return refs


def import_references(conn: sqlite3.Connection, icon_id: int, part_number: str, part_dir: Path | None, now: str) -> None:
    doc_dir = PART_DOCS_DIR / DOC_SUBDIR
    doc_dir.mkdir(parents=True, exist_ok=True)
    prefix = f"{DOC_SUBDIR}/{part_number}_"

    rows = conn.execute(
        "SELECT id, stored_path FROM icon_files WHERE icon_id=? AND stored_path LIKE ?",
        (icon_id, f"{prefix}%"),
    ).fetchall()
    for row in rows:
        (PART_DOCS_DIR / row["stored_path"]).unlink(missing_ok=True)
    conn.execute(
        "DELETE FROM icon_files WHERE icon_id=? AND stored_path LIKE ?",
        (icon_id, f"{prefix}%"),
    )

    for source, folder in reference_files(part_dir):
        filename = source.name
        stored = f"{prefix}{safe_name(filename)}"
        target = PART_DOCS_DIR / stored
        shutil.copy2(source, target)
        conn.execute(
            """
            INSERT INTO icon_files
                (icon_id, filename, stored_path, mime_type, size_bytes, uploaded_at, folder)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                icon_id,
                filename,
                stored,
                mimetypes.guess_type(filename)[0] or "text/plain",
                target.stat().st_size,
                now,
                folder,
            ),
        )


def upsert_part(conn: sqlite3.Connection, row: dict[str, str], now: str) -> tuple[int, str]:
    part_number = clean_text(row.get("part_number"))
    part_dir = find_part_dir(part_number)
    info = read_text(part_dir / "info.txt") if part_dir else ""
    fields = parse_info_fields(info)

    name = (
        clean_text(row.get("friendly_name"))
        or clean_text(row.get("phoenix_name"))
        or fields.get("phoenix contact")
        or part_number
    )
    bom_description = clean_text(row.get("bom_description"))
    category = clean_text(row.get("category")) or "Phoenix Contact"
    folder = (clean_text(row.get("folder")) or category)[:80]
    description = description_from(row, info)

    links = dedupe_links([
        *parse_info_links(info),
        {"label": "Product page", "url": row.get("product_url", "")},
        {"label": "Datasheet PDF", "url": row.get("datasheet_pdf_url", "")},
        {"label": "3D / CAD downloads", "url": row.get("downloads_url", "")},
    ])
    connectors = connectors_for(row)

    existing = conn.execute(
        "SELECT id FROM icons WHERE part_number=?",
        (part_number,),
    ).fetchone()
    if existing:
        # Preserve the existing image pointer — the user may have uploaded a
        # custom icon. Only refresh metadata fields.
        icon_id = int(existing["id"])
        conn.execute(
            """
            UPDATE icons
               SET name=?, folder=?, description=?, part_number=?, links_json=?
             WHERE id=?
            """,
            (
                name,
                folder,
                description,
                part_number,
                json.dumps(links),
                icon_id,
            ),
        )
    else:
        icon_filename, icon_rel_path, icon_mime = copy_icon(part_dir, part_number, name, category)
        cur = conn.execute(
            """
            INSERT INTO icons
                (name, filename, stored_path, mime_type, uploaded_at, connectors_json,
                 folder, description, part_number, links_json)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                name,
                icon_filename,
                icon_rel_path,
                icon_mime,
                now,
                json.dumps(connectors),
                folder,
                description,
                part_number,
                json.dumps(links),
            ),
        )
        icon_id = int(cur.lastrowid)

    conn.execute(
        "INSERT OR IGNORE INTO icon_folders (name, created_at) VALUES (?, ?)",
        (folder, now),
    )
    import_references(conn, icon_id, part_number, part_dir, now)
    return icon_id, f"{part_number} {name} ({bom_description or category})"


def relabel_existing_nodes(conn: sqlite3.Connection) -> int:
    """Cascade icon names onto every persisted diagram node that references them.

    Mirrors the frontend's cascadeIconRenameInDiagram so re-importing the parts
    library retroactively refreshes labels on diagrams and subdiagrams that
    were saved before friendly_name existed.
    """
    icons = {row["id"]: row["name"] for row in conn.execute("SELECT id, name FROM icons").fetchall()}
    if not icons:
        return 0

    total = 0
    for icon_id, name in icons.items():
        cur = conn.execute(
            "UPDATE nodes SET label=? WHERE icon=? AND label<>?",
            (name, f"custom:{icon_id}", name),
        )
        total += cur.rowcount or 0

    def rewrite_blob(blob_json: str) -> tuple[str, int]:
        try:
            doc = json.loads(blob_json)
        except (TypeError, ValueError):
            return blob_json, 0
        changed = 0
        for node in doc.get("nodes", []) or []:
            icon_key = str(node.get("icon") or "")
            if not icon_key.startswith("custom:"):
                continue
            try:
                icon_id = int(icon_key.split(":", 1)[1])
            except ValueError:
                continue
            new_name = icons.get(icon_id)
            if new_name and node.get("label") != new_name:
                node["label"] = new_name
                changed += 1
        return (json.dumps(doc) if changed else blob_json), changed

    for row in conn.execute("SELECT platform_id, drawflow_json FROM diagrams").fetchall():
        new_blob, changed = rewrite_blob(row["drawflow_json"])
        if changed:
            conn.execute(
                "UPDATE diagrams SET drawflow_json=? WHERE platform_id=?",
                (new_blob, row["platform_id"]),
            )
            total += changed

    for row in conn.execute("SELECT id, drawflow_json FROM subdiagrams").fetchall():
        new_blob, changed = rewrite_blob(row["drawflow_json"])
        if changed:
            conn.execute(
                "UPDATE subdiagrams SET drawflow_json=? WHERE id=?",
                (new_blob, row["id"]),
            )
            total += changed

    return total


def backup_db() -> Path | None:
    if not DB_PATH.exists():
        return None
    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    target = DB_PATH.with_name(f"{DB_PATH.name}.bak_{stamp}")
    shutil.copy2(DB_PATH, target)
    return target


def main() -> None:
    if not LIBRARY_ROOT.exists():
        raise SystemExit(f"Parts library not found: {LIBRARY_ROOT}")

    backup = backup_db()
    if backup is not None:
        print(f"Backed up DB to {backup.name}")

    rows = read_index()
    now = utcnow_iso()
    imported: list[str] = []
    relabeled = 0
    with get_conn() as conn:
        for row in rows:
            if not row.get("part_number"):
                continue
            icon_id, label = upsert_part(conn, row, now)
            imported.append(f"{icon_id}: {label}")
        relabeled = relabel_existing_nodes(conn)

    print(f"Imported {len(imported)} parts from {LIBRARY_ROOT}")
    for item in imported:
        print(f"- {item}")
    print(f"Relabeled {relabeled} existing diagram node(s) to match icon names")


if __name__ == "__main__":
    main()
