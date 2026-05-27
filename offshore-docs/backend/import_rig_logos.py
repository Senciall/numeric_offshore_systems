"""Import rig logo PNGs from the sibling ``Rig Logos`` folder.

Reads each image in ``<repo>/Rig Logos/``, fuzzy-matches its stem to a
platform name (case-insensitive, non-alphanumerics stripped), copies the
file to ``data/platform_logos/<platform_id><ext>``, and stores the
filename on ``platforms.logo_filename``. Safe to re-run.
"""
from __future__ import annotations

import re
import shutil
from pathlib import Path

from db import PLATFORM_LOGOS_DIR, PROJECT_ROOT, get_conn, init_db

LOGOS_ROOT = PROJECT_ROOT.parent / "Rig Logos"
IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".svg"}


def _normalize(name: str) -> str:
    return re.sub(r"[^a-z0-9]", "", name.lower())


def main() -> None:
    init_db()
    if not LOGOS_ROOT.is_dir():
        print(f"No logos folder at {LOGOS_ROOT}")
        return

    with get_conn() as conn:
        platforms = conn.execute("SELECT id, name FROM platforms").fetchall()
        index = {_normalize(p["name"]): p for p in platforms}

        matched = []
        skipped = []
        for path in sorted(LOGOS_ROOT.iterdir()):
            if not path.is_file() or path.suffix.lower() not in IMAGE_EXTENSIONS:
                continue
            platform = index.get(_normalize(path.stem))
            if platform is None:
                skipped.append(path.name)
                continue
            dest_name = f"{platform['id']}{path.suffix.lower()}"
            dest = PLATFORM_LOGOS_DIR / dest_name
            # Remove stale files for this platform with a different extension.
            for stale in PLATFORM_LOGOS_DIR.glob(f"{platform['id']}.*"):
                if stale.name != dest_name:
                    stale.unlink()
            shutil.copyfile(path, dest)
            conn.execute(
                "UPDATE platforms SET logo_filename=? WHERE id=?",
                (dest_name, platform["id"]),
            )
            matched.append((path.name, platform["name"]))

        used_norms = {_normalize(name) for name, _ in matched}
        all_logo_norms = {
            _normalize(p.stem)
            for p in LOGOS_ROOT.iterdir()
            if p.is_file() and p.suffix.lower() in IMAGE_EXTENSIONS
        }
        unmatched_platforms = [
            p["name"] for p in platforms if _normalize(p["name"]) not in all_logo_norms
        ]

    print(f"Matched {len(matched)} logo(s):")
    for logo, platform in matched:
        print(f"  {logo}  ->  {platform}")
    if skipped:
        print(f"\nLogos with no matching platform ({len(skipped)}):")
        for name in skipped:
            print(f"  {name}")
    if unmatched_platforms:
        print(f"\nPlatforms with no logo ({len(unmatched_platforms)}):")
        for name in unmatched_platforms:
            print(f"  {name}")


if __name__ == "__main__":
    main()
