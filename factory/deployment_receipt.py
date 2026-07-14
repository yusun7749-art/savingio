from __future__ import annotations
from pathlib import Path
import hashlib, json
from .utils import save_json, now_iso

def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()

def build_receipt(project_root: Path, provider: str, status: str, files: list[str], detail: dict) -> dict:
    file_rows = []
    for rel in dict.fromkeys(files):
        path = project_root / rel
        if path.exists() and path.is_file():
            file_rows.append({
                "path": rel,
                "bytes": path.stat().st_size,
                "sha256": sha256_file(path),
            })
    receipt = {
        "provider": provider,
        "status": status,
        "files": file_rows,
        "detail": detail,
        "created_at": now_iso(),
    }
    save_json(project_root / "factory" / "output" / "deployment_receipt.json", receipt)
    return receipt
