from __future__ import annotations

import json
from pathlib import Path

from .catalog import related_links, write_catalog
from .seo import build_seo
from .utils import now_iso, save_json
from .writer import generate_article
from .writer_dna import load_writer_rules, validate_writer_html

WRITER_QUEUE_PATH = Path("factory/output/research/writer_queue.json")
OUTPUT_PATH = Path("factory/output/writer/writer_hq_report.json")
QUEUE_PATH = Path("factory/output/writer/seo_queue.json")
ITEMS_DIR = Path("factory/output/writer/items")
DRAFTS_DIR = Path("factory/output/drafts")


def _load_json(path: Path) -> dict:
    if not path.is_file():
        raise FileNotFoundError(f"필수 파일이 없습니다: {path}")
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, dict):
        raise ValueError(f"JSON 객체가 필요합니다: {path}")
    return payload


def _load_writer_queue(root: Path) -> dict:
    payload = _load_json(root / WRITER_QUEUE_PATH)
    pending = payload.get("pending", [])
    if not isinstance(pending, list):
        raise ValueError("writer_queue pending must be a list")
    return payload


def _load_research_package(root: Path, item: dict) -> dict:
    files = item.get("research_files", {})
    relative = files.get("package") if isinstance(files, dict) else None
    if not relative:
        relative = "factory/output/research/research_package.json"
    return _load_json(root / str(relative))


def run_writer_queue(root: Path, limit: int | None = None) -> dict:
    """Consume Research HQ handoff and create durable HTML drafts for SEO HQ."""
    root = root.resolve()
    queue = _load_writer_queue(root)
    pending = list(queue.get("pending", []))
    if limit is not None:
        if limit < 1:
            raise ValueError("limit must be at least 1")
        pending = pending[:limit]
    if not pending:
        raise ValueError("작성할 조사 완료 주제가 없습니다.")

    config_dir = root / "factory/config"
    writer_rules = load_writer_rules(config_dir)
    output_dir = root / "factory/output"
    catalog = write_catalog(root, output_dir)
    completed: list[dict] = []
    failed: list[dict] = []
    seo_pending: list[dict] = []

    for item in pending:
        topic = str(item.get("topic", "")).strip()
        slug = str(item.get("slug", "")).strip()
        if not topic or not slug:
            failed.append({**item, "status": "failed", "error": "topic 또는 slug 누락"})
            continue
        try:
            research = _load_research_package(root, item)
            plan = {
                "topic": topic,
                "slug": slug,
                "category": str(item.get("category", "생활비 절약")),
                "article_type": str(item.get("article_type", "guide")),
                "search_intent": str(item.get("search_intent", "informational")),
            }
            seo = build_seo(plan, config_dir)
            related = related_links(topic, catalog, limit=5)
            html = generate_article(plan, research, seo, related=related, config_dir=config_dir)
            writer_qa = validate_writer_html(html, writer_rules)
            if not writer_qa.passed:
                raise RuntimeError("Writer QA 실패: " + ", ".join(writer_qa.failures))

            draft_path = root / DRAFTS_DIR / f"{slug}.html"
            draft_path.parent.mkdir(parents=True, exist_ok=True)
            draft_path.write_text(html, encoding="utf-8")

            item_dir = root / ITEMS_DIR / slug
            item_dir.mkdir(parents=True, exist_ok=True)
            item_html = item_dir / f"{slug}.html"
            item_html.write_text(html, encoding="utf-8")
            save_json(item_dir / "seo_seed.json", seo)
            save_json(item_dir / "writer_qa.json", writer_qa.as_dict())

            result = {
                **item,
                "status": "ready",
                "draft_path": draft_path.relative_to(root).as_posix(),
                "writer_archive_path": item_html.relative_to(root).as_posix(),
                "seo_seed_path": (item_dir / "seo_seed.json").relative_to(root).as_posix(),
                "writer_qa_path": (item_dir / "writer_qa.json").relative_to(root).as_posix(),
                "writer_qa_score": writer_qa.score,
                "plaintext_chars": writer_qa.plaintext_chars,
                "html_bytes": len(html.encode("utf-8")),
                "completed_at": now_iso(),
            }
            completed.append(result)
            seo_pending.append(result)
        except Exception as exc:
            failed.append({
                **item,
                "status": "failed",
                "error": f"{type(exc).__name__}: {exc}",
                "failed_at": now_iso(),
            })

    processed = {str(item.get("slug")) for item in completed + failed}
    remaining = [item for item in queue.get("pending", []) if str(item.get("slug")) not in processed]
    queue["pending"] = remaining
    queue["completed"] = list(queue.get("completed", [])) + completed
    queue["failed"] = list(queue.get("failed", [])) + failed
    queue["status"] = "completed" if not remaining and not failed else ("partial" if completed else "failed")
    queue["updated_at"] = now_iso()
    save_json(root / WRITER_QUEUE_PATH, queue)

    created_at = now_iso()
    seo_queue = {
        "department": "seo",
        "status": "ready" if seo_pending else "blocked",
        "created_at": created_at,
        "pending": seo_pending,
        "completed": [],
        "failed": [],
    }
    report = {
        "department": "writer",
        "status": "completed" if completed and not failed else ("partial" if completed else "failed"),
        "requested": len(pending),
        "completed_count": len(completed),
        "failed_count": len(failed),
        "seo_ready_count": len(seo_pending),
        "created_at": created_at,
        "items": completed,
        "failures": failed,
        "handoff": {"next_department": "seo", "queue_path": QUEUE_PATH.as_posix()},
        "pass": bool(completed) and not failed,
    }
    save_json(root / OUTPUT_PATH, report)
    save_json(root / QUEUE_PATH, seo_queue)
    return report
