from __future__ import annotations

import json
from pathlib import Path

from factory.image_hq import run_image_queue


def _write_json(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def test_image_hq_creates_brief_job_and_qa_handoff(tmp_path: Path) -> None:
    root = tmp_path
    draft = root / "factory/output/drafts/test-topic.html"
    draft.parent.mkdir(parents=True, exist_ok=True)
    draft.write_text("<html><body>ok</body></html>", encoding="utf-8")
    seo_path = root / "factory/output/seo/items/test-topic/seo.json"
    _write_json(seo_path, {
        "slug": "test-topic",
        "title": "테스트 제목",
        "description": "테스트 설명",
        "canonical": "https://savingio.com/articles/test-topic.html",
        "schema": {"@type": "Article"},
    })
    _write_json(root / "factory/output/seo/image_queue.json", {
        "department": "image",
        "status": "ready",
        "pending": [{
            "topic": "테스트 주제",
            "slug": "test-topic",
            "category": "생활비 절약",
            "article_type": "guide",
            "draft_path": draft.relative_to(root).as_posix(),
            "seo_path": seo_path.relative_to(root).as_posix(),
        }],
        "completed": [],
        "failed": [],
    })

    report = run_image_queue(root, limit=1)

    assert report["pass"] is True
    assert report["completed_count"] == 1
    item = report["items"][0]
    assert item["image_ready"] is False
    assert item["requires_external_image_generation"] is True
    brief_path = root / item["image_brief_path"]
    assert brief_path.is_file()
    brief = json.loads(brief_path.read_text(encoding="utf-8"))
    assert brief["hero"]["filename"] == "test-topic-hero.webp"
    assert brief["og"]["filename"] == "test-topic-og.webp"

    qa_queue = json.loads((root / "factory/output/image/qa1_queue.json").read_text(encoding="utf-8"))
    assert qa_queue["status"] == "ready"
    assert len(qa_queue["pending"]) == 1
    assert list((root / "factory/state/image_queue/pending").glob("*.json"))


def test_image_hq_fails_when_draft_is_missing(tmp_path: Path) -> None:
    root = tmp_path
    seo_path = root / "factory/output/seo/items/missing/seo.json"
    _write_json(seo_path, {
        "slug": "missing",
        "title": "제목",
        "description": "설명",
        "canonical": "https://savingio.com/articles/missing.html",
        "schema": {"@type": "Article"},
    })
    _write_json(root / "factory/output/seo/image_queue.json", {
        "department": "image",
        "status": "ready",
        "pending": [{
            "topic": "누락 테스트",
            "slug": "missing",
            "draft_path": "factory/output/drafts/missing.html",
            "seo_path": seo_path.relative_to(root).as_posix(),
        }],
        "completed": [],
        "failed": [],
    })

    report = run_image_queue(root)

    assert report["pass"] is False
    assert report["failed_count"] == 1
    assert report["completed_count"] == 0
