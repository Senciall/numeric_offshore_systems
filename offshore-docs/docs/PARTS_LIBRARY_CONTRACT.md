# Parts Library Contract

The parts library is protected project functionality. Cleanup work must preserve the following behavior unless a specific change is proposed and approved first.

## Protected Inputs

- `../Parts Library/`
- `../Parts Library/parts_index.csv`
- all per-part folders, images, metadata files, links, and reference documents

Do not rename, move, delete, regenerate, or reorganize those inputs without approval.

## Preserved Part Fields

Imported parts must keep:

- part number
- manufacturer/name
- display label
- category/folder
- description
- product and datasheet links
- thumbnail/icon image
- reference documents
- connector templates
- document folder labels
- uploaded/import timestamps where used for cache busting

## Preserved Runtime Contracts

The frontend and saved diagrams depend on:

- `/api/icons`
- `/api/icons/{icon_id}`
- `/api/icon-documents/{file_id}`
- diagram node icon keys in the `custom:{id}` format
- SQLite tables `icons` and `icon_files`
- filesystem paths stored in `icons.stored_path` and `icon_files.stored_path`

Refactors must preserve these public contracts unless an explicit migration plan is approved.

## Safe Verification

Before and after cleanup touching related code, run:

```powershell
cd offshore-docs\backend
..\.venv\Scripts\python.exe .\check_parts_integrity.py
```

Expected output may include warnings for old demo/test diagram nodes that reference deleted parts. Those warnings should be reviewed, not automatically repaired.

## Approval Required

Ask before:

- deleting any imported image or document copy
- changing importer matching rules
- changing best-image selection logic
- rewriting diagram JSON
- modifying database rows directly
- changing category names or folder assignments
- removing stale-looking parts from the database
