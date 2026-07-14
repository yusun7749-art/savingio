from __future__ import annotations
from pathlib import Path
import hashlib, json, time
from .utils import save_json, now_iso

def cache_key(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()

class ResearchCache:
    def __init__(self, project_root: Path, ttl_seconds: int = 86400):
        self.root = project_root / "factory" / "state" / "research_cache"
        self.root.mkdir(parents=True, exist_ok=True)
        self.ttl_seconds = int(ttl_seconds)

    def path_for(self, key: str) -> Path:
        return self.root / f"{cache_key(key)}.json"

    def put(self, key: str, payload: dict) -> str:
        path = self.path_for(key)
        save_json(path, {"key":key,"saved_at_epoch":time.time(),"saved_at":now_iso(),"payload":payload})
        return path.as_posix()

    def get(self, key: str) -> dict | None:
        path = self.path_for(key)
        if not path.exists():
            return None
        data = json.loads(path.read_text(encoding="utf-8"))
        if time.time() - float(data.get("saved_at_epoch",0)) > self.ttl_seconds:
            return None
        return data.get("payload")

    def purge_expired(self) -> int:
        removed = 0
        for path in self.root.glob("*.json"):
            try:
                data = json.loads(path.read_text(encoding="utf-8"))
                if time.time() - float(data.get("saved_at_epoch",0)) > self.ttl_seconds:
                    path.unlink()
                    removed += 1
            except Exception:
                path.unlink(missing_ok=True)
                removed += 1
        return removed
