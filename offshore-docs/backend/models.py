"""Pydantic request/response models."""
from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class PlatformOut(BaseModel):
    id: int
    name: str
    description: str | None = None
    created_at: str


class PlatformCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    description: str | None = None


class DiagramOut(BaseModel):
    drawflow_json: dict[str, Any]
    updated_at: str


class DiagramSaveIn(BaseModel):
    drawflow_json: dict[str, Any]


class DiagramSaveOut(BaseModel):
    updated_at: str
    node_count: int


class SubdiagramCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)


class SubdiagramOut(BaseModel):
    id: int
    platform_id: int
    parent_node_id: str
    parent_label: str | None = None
    name: str
    created_at: str
    updated_at: str


class NodeWithCount(BaseModel):
    id: str
    platform_id: int
    diagram_ref: str = "root"
    label: str
    kind: str | None = None
    icon: str = "generic"
    port_in: int = 1
    port_out: int = 1
    file_count: int = 0


class FileMeta(BaseModel):
    id: int
    node_id: str
    filename: str
    mime_type: str
    size_bytes: int
    uploaded_at: str
    category: str | None = None
    notes: str | None = None


class IconDocumentOut(BaseModel):
    id: int
    icon_id: int
    filename: str
    mime_type: str
    size_bytes: int
    uploaded_at: str
    folder: str = "Documents"


class IconFolderCreate(BaseModel):
    name: str = Field(min_length=1, max_length=80)


class IconFolderOut(BaseModel):
    name: str
    created_at: str | None = None
    part_count: int = 0


class IconOut(BaseModel):
    id: int
    name: str
    filename: str
    mime_type: str
    uploaded_at: str
    folder: str = "Unsorted"
    part_number: str | None = None
    description: str | None = None
    links: list[dict[str, str]] = Field(default_factory=list)
    connectors: list[dict[str, Any]] = Field(default_factory=list)
    documents: list[IconDocumentOut] = Field(default_factory=list)


class FileNotesUpdate(BaseModel):
    notes: str | None = Field(None, max_length=500)


class EditAuthRequest(BaseModel):
    password: str


# --- Project file-explorer ---------------------------------------------------

class ProjectFolderCreate(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    parent_id: int | None = None
    diagram_ref: str = "root"


class ProjectFolderRename(BaseModel):
    name: str = Field(min_length=1, max_length=80)


class ProjectFileOut(BaseModel):
    id: int
    folder_id: int | None
    filename: str
    mime_type: str
    size_bytes: int
    uploaded_at: str


class ProjectFolderOut(BaseModel):
    id: int
    name: str
    parent_id: int | None
    created_at: str
    children: list["ProjectFolderOut"] = Field(default_factory=list)
    files: list[ProjectFileOut] = Field(default_factory=list)


ProjectFolderOut.model_rebuild()


class ProjectTreeOut(BaseModel):
    folders: list[ProjectFolderOut]
    files: list[ProjectFileOut]
