from __future__ import annotations
from pathlib import Path
import json, re
from .utils import save_json, now_iso

HQ_CATEGORIES = [
    "salary","tax","utility","finance","loan",
    "savings","insurance","business","health","life"
]

def load_registry(config_dir: Path) -> dict:
    path = config_dir/"calculator_registry.json"
    return json.loads(path.read_text(encoding="utf-8"))

def save_registry(config_dir: Path, registry: dict) -> dict:
    registry["updated_at"] = now_iso()
    save_json(config_dir/"calculator_registry.json", registry)
    return registry

def list_calculators(config_dir: Path, category: str | None = None) -> list[dict]:
    rows = load_registry(config_dir).get("calculators", [])
    if category:
        rows = [row for row in rows if row.get("category") == category]
    return rows

def get_calculator(config_dir: Path, calculator_id: str) -> dict | None:
    return next((row for row in list_calculators(config_dir) if row.get("id")==calculator_id), None)

def discover_existing_calculators(project_root: Path) -> list[dict]:
    candidates = []
    for path in project_root.rglob("*.html"):
        rel = path.relative_to(project_root).as_posix()
        lower = rel.lower()
        if "calculator" not in lower and "calc" not in lower and "계산" not in path.name:
            continue
        text = path.read_text(encoding="utf-8", errors="ignore")[:6000]
        title_match = re.search(r"<title>(.*?)</title>", text, re.I|re.S)
        title = re.sub(r"<[^>]+>","",title_match.group(1)).strip() if title_match else path.stem
        candidates.append({
            "id": path.stem.replace("-calculator","").replace("_calculator",""),
            "title": title,
            "category": "life",
            "url": "/" + rel,
            "status": "existing",
            "article_topics": [],
            "input_fields": [],
            "result_fields": [],
            "next_actions": [],
        })
    return candidates
