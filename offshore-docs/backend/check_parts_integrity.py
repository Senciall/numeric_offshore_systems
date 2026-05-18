"""Read-only checks for imported parts-library integrity.

This script intentionally does not modify the database, saved diagrams, or the
external Parts Library folder. It reports missing files, malformed metadata, and
saved diagram references to deleted custom icons.
"""
from __future__ import annotations

import csv
import json
from pathlib import Path
from typing import Any

from db import ICONS_DIR, PART_DOCS_DIR, PROJECT_ROOT, get_conn


PARTS_LIBRARY_ROOT = PROJECT_ROOT.parent / "Parts Library"
PARTS_INDEX = PARTS_LIBRARY_ROOT / "parts_index.csv"


def _load_json(value: str | None, label: str, errors: list[str]) -> Any:
    if value in (None, ""):
        return None
    try:
        return json.loads(value)
    except json.JSONDecodeError as exc:
        errors.append(f"{label}: invalid JSON ({exc})")
        return None


def _read_index_part_numbers(warnings: list[str]) -> set[str]:
    if not PARTS_INDEX.exists():
        warnings.append(f"parts_index.csv not found at {PARTS_INDEX}")
        return set()

    with PARTS_INDEX.open("r", encoding="utf-8-sig", newline="") as fh:
        reader = csv.DictReader(fh)
        if "part_number" not in (reader.fieldnames or []):
            warnings.append(f"{PARTS_INDEX} has no part_number column")
            return set()
        return {
            str(row.get("part_number") or "").strip()
            for row in reader
            if str(row.get("part_number") or "").strip()
        }


def _custom_refs(diagram: dict[str, Any]) -> list[tuple[str, str]]:
    refs: list[tuple[str, str]] = []
    for node in diagram.get("nodes", []) if isinstance(diagram, dict) else []:
        icon = str(node.get("icon") or "")
        if icon.startswith("custom:"):
            refs.append((str(node.get("label") or node.get("id") or "unlabeled"), icon))
    return refs


def main() -> int:
    errors: list[str] = []
    warnings: list[str] = []
    info: list[str] = []

    expected_part_numbers = _read_index_part_numbers(warnings)

    with get_conn() as conn:
        icons = conn.execute(
            """
            SELECT id, name, part_number, folder, filename, stored_path, mime_type,
                   connectors_json, links_json
            FROM icons
            ORDER BY id
            """
        ).fetchall()
        icon_docs = conn.execute(
            """
            SELECT id, icon_id, filename, stored_path, mime_type, folder
            FROM icon_files
            ORDER BY icon_id, id
            """
        ).fetchall()
        diagrams = conn.execute(
            "SELECT platform_id, drawflow_json FROM diagrams ORDER BY platform_id"
        ).fetchall()
        subdiagrams = conn.execute(
            "SELECT id, platform_id, name, drawflow_json FROM subdiagrams ORDER BY id"
        ).fetchall()

    icon_ids = {int(row["id"]) for row in icons}
    db_part_numbers = {
        str(row["part_number"] or "").strip()
        for row in icons
        if str(row["part_number"] or "").strip()
    }

    for row in icons:
        prefix = f"icon {row['id']} ({row['part_number'] or row['name']})"
        if not str(row["name"] or "").strip():
            errors.append(f"{prefix}: missing name")
        if not str(row["folder"] or "").strip():
            warnings.append(f"{prefix}: empty folder")
        if not (ICONS_DIR / row["stored_path"]).exists():
            errors.append(f"{prefix}: missing icon file {row['stored_path']}")

        connectors = _load_json(row["connectors_json"], f"{prefix} connectors_json", errors)
        if connectors is not None and not isinstance(connectors, list):
            errors.append(f"{prefix}: connectors_json is not a list")

        links = _load_json(row["links_json"], f"{prefix} links_json", errors)
        if links is not None and not isinstance(links, list):
            errors.append(f"{prefix}: links_json is not a list")

    for row in icon_docs:
        prefix = f"icon document {row['id']} for icon {row['icon_id']}"
        if int(row["icon_id"]) not in icon_ids:
            errors.append(f"{prefix}: icon_id has no matching icon")
        if not (PART_DOCS_DIR / row["stored_path"]).exists():
            errors.append(f"{prefix}: missing document file {row['stored_path']}")

    if expected_part_numbers:
        missing_from_db = sorted(expected_part_numbers - db_part_numbers)
        extra_in_db = sorted(db_part_numbers - expected_part_numbers)
        if missing_from_db:
            errors.append(
                "parts_index.csv part numbers missing from icons table: "
                + ", ".join(missing_from_db)
            )
        if extra_in_db:
            info.append(
                "icons table has part numbers not listed in parts_index.csv: "
                + ", ".join(extra_in_db)
            )

    for row in diagrams:
        try:
            diagram = json.loads(row["drawflow_json"])
        except json.JSONDecodeError as exc:
            errors.append(f"platform {row['platform_id']} diagram JSON invalid: {exc}")
            continue
        for label, icon in _custom_refs(diagram):
            icon_id = icon.split(":", 1)[1]
            if not icon_id.isdigit() or int(icon_id) not in icon_ids:
                warnings.append(
                    f"platform {row['platform_id']} node '{label}' references missing {icon}"
                )

    for row in subdiagrams:
        try:
            diagram = json.loads(row["drawflow_json"])
        except json.JSONDecodeError as exc:
            errors.append(f"subdiagram {row['id']} JSON invalid: {exc}")
            continue
        for label, icon in _custom_refs(diagram):
            icon_id = icon.split(":", 1)[1]
            if not icon_id.isdigit() or int(icon_id) not in icon_ids:
                warnings.append(
                    f"subdiagram {row['id']} ({row['name']}) node '{label}' references missing {icon}"
                )

    print("Parts integrity check")
    print(f"- icons: {len(icons)}")
    print(f"- icon documents: {len(icon_docs)}")
    print(f"- parts_index entries: {len(expected_part_numbers)}")
    print(f"- diagrams checked: {len(diagrams)} root, {len(subdiagrams)} subdiagram(s)")

    if info:
        print("\nInfo:")
        for item in info:
            print(f"- {item}")

    if warnings:
        print("\nWarnings:")
        for warning in warnings:
            print(f"- {warning}")

    if errors:
        print("\nErrors:")
        for error in errors:
            print(f"- {error}")
        return 1

    print("\nNo blocking integrity errors found.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
