from __future__ import annotations
from pathlib import Path
import json
from .utils import now_iso, safe_slug

def append_history(project_root: Path, event: str, payload: dict):
    history_dir = project_root / "factory" / "history"
    history_dir.mkdir(parents=True, exist_ok=True)
    line = json.dumps({"time": now_iso(), "event": event, "payload": payload}, ensure_ascii=False)
    with (history_dir / "events.jsonl").open("a", encoding="utf-8") as f:
        f.write(line + "\n")

def save_run_snapshot(project_root: Path, topic: str, payload: dict):
    history_dir = project_root / "factory" / "history"
    history_dir.mkdir(parents=True, exist_ok=True)
    path = history_dir / f"{safe_slug(topic)}.json"
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    return path
