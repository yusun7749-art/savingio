from __future__ import annotations

import json
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Iterable

from .planner import build_plan
from .utils import now_iso, save_json

POOL_PATH = Path("factory/config/auto_topic_pool.json")
OUTPUT_PATH = Path("factory/output/planning/planning.json")
QUEUE_PATH = Path("factory/output/planning/planning_queue.json")


@dataclass(frozen=True)
class PlannedTopic:
    order: int
    topic: str
    slug: str
    category: str
    article_type: str
    search_intent: str
    status: str = "ready"


def _load_topic_pool(root: Path) -> list[str]:
    path = root / POOL_PATH
    payload = json.loads(path.read_text(encoding="utf-8"))
    topics = payload.get("topics", [])
    if not isinstance(topics, list):
        raise ValueError("auto_topic_pool topics must be a list")
    return [str(topic).strip() for topic in topics if str(topic).strip()]


def _existing_slugs(root: Path) -> set[str]:
    slugs: set[str] = set()
    for folder in (root, root / "articles", root / "factory/output/drafts"):
        if folder.exists():
            slugs.update(path.stem for path in folder.glob("*.html"))

    catalog = root / "factory/output/article_catalog.json"
    if catalog.exists():
        try:
            payload = json.loads(catalog.read_text(encoding="utf-8"))
            items = payload.get("items", payload if isinstance(payload, list) else [])
            for item in items:
                if isinstance(item, dict) and item.get("slug"):
                    slugs.add(str(item["slug"]))
        except (OSError, json.JSONDecodeError):
            pass
    return slugs


def create_plan(root: Path, count: int, topics: Iterable[str] | None = None) -> dict:
    """Create a deduplicated planning handoff for downstream departments."""
    root = root.resolve()
    if count < 1:
        raise ValueError("count must be at least 1")

    candidates = [str(topic).strip() for topic in topics] if topics is not None else _load_topic_pool(root)
    candidates = [topic for topic in candidates if topic]
    used = _existing_slugs(root)
    selected: list[PlannedTopic] = []
    config_dir = root / "factory/config"

    for topic in candidates:
        plan = build_plan(topic, config_dir)
        slug = str(plan["slug"])
        if slug in used:
            continue
        selected.append(
            PlannedTopic(
                order=len(selected) + 1,
                topic=topic,
                slug=slug,
                category=str(plan["category"]),
                article_type=str(plan["article_type"]),
                search_intent=str(plan["search_intent"]),
            )
        )
        used.add(slug)
        if len(selected) == count:
            break

    if len(selected) != count:
        raise RuntimeError(f"사용 가능한 자동 주제가 부족합니다: 요청 {count}, 선택 {len(selected)}")

    created_at = now_iso()
    items = [asdict(item) for item in selected]
    report = {
        "department": "planning",
        "status": "completed",
        "requested": count,
        "selected_count": len(items),
        "created_at": created_at,
        "items": items,
        "handoff": {"next_department": "research", "queue_path": QUEUE_PATH.as_posix()},
        "pass": len(items) == count,
    }
    queue = {
        "department": "research",
        "status": "ready",
        "created_at": created_at,
        "pending": items,
        "completed": [],
        "failed": [],
    }
    save_json(root / OUTPUT_PATH, report)
    save_json(root / QUEUE_PATH, queue)
    return report
