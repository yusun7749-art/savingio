from __future__ import annotations
from pathlib import Path
import hashlib, json
from .utils import now_iso, save_json

def file_checksum(path: Path):
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024*1024), b""):
            h.update(chunk)
    return h.hexdigest()

def build_release_manifest(project_root: Path, changed_files: list[str], version: str):
    files = []
    for rel in dict.fromkeys(changed_files):
        path = project_root/rel
        if path.exists() and path.is_file():
            files.append({
                "path": rel,
                "bytes": path.stat().st_size,
                "sha256": file_checksum(path),
            })
    manifest = {
        "version": version,
        "created_at": now_iso(),
        "file_count": len(files),
        "files": files,
    }
    save_json(project_root/"factory"/"output"/"release_manifest.json", manifest)
    return manifest
