from __future__ import annotations
from pathlib import Path
from datetime import datetime, timezone
import hashlib, json, re, html

def now_iso() -> str:
    return datetime.now(timezone.utc).astimezone().isoformat(timespec="seconds")

def load_json(path: Path, default=None):
    if not path.exists():
        if default is not None: return default
        raise FileNotFoundError(path)
    return json.loads(path.read_text(encoding="utf-8"))

def save_json(path: Path, data) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")

def safe_slug(text: str) -> str:
    latin = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
    if latin: return latin[:90]
    ko = re.sub(r"[^\w가-힣-]+", "", re.sub(r"\s+", "-", text.strip()))
    digest = hashlib.sha1(text.encode("utf-8")).hexdigest()[:8]
    return f"{ko[:55] or 'article'}-{digest}"

def text_only(markup: str) -> str:
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", markup))).strip()

def atomic_write(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp=path.with_suffix(path.suffix+'.tmp')
    tmp.write_text(content,encoding='utf-8')
    tmp.replace(path)

def relative_posix(path: Path, root: Path) -> str:
    return path.resolve().relative_to(root.resolve()).as_posix()
