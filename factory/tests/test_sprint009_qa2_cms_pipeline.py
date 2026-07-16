from __future__ import annotations

import json
from pathlib import Path

from factory.qa2_hq import run_qa2_queue
from factory.cms_hq import run_cms_queue


def _ready_item(root: Path, *, image_ready: bool = True, research_ready: bool = True) -> dict:
    draft = root / "factory/output/drafts/sample.html"
    draft.parent.mkdir(parents=True, exist_ok=True)
    draft.write_text("<html><body><h1>sample</h1></body></html>", encoding="utf-8")
    return {
        "topic": "sample",
        "slug": "sample",
        "draft_path": "factory/output/drafts/sample.html",
        "qa1_pass": True,
        "seo_pass": True,
        "ready_for_publish": research_ready,
        "image_ready": image_ready,
    }


def test_qa2_hands_release_ready_item_to_cms(tmp_path: Path) -> None:
    report = run_qa2_queue(tmp_path, source_items=[_ready_item(tmp_path)])
    assert report["pass"] is True
    assert report["release_ready_count"] == 1
    queue = json.loads((tmp_path / "factory/output/qa2/cms_queue.json").read_text(encoding="utf-8"))
    assert len(queue["pending"]) == 1
    assert queue["pending"][0]["qa2_pass"] is True


def test_qa2_records_external_image_blocker_without_failure(tmp_path: Path) -> None:
    report = run_qa2_queue(tmp_path, source_items=[_ready_item(tmp_path, image_ready=False)])
    assert report["pass"] is True
    assert report["release_ready_count"] == 0
    assert "image_pending_external_generation" in report["items"][0]["qa2_blockers"]


def test_cms_promotes_only_qa2_approved_items_and_builds_queues(tmp_path: Path) -> None:
    item = _ready_item(tmp_path)
    item["qa2_pass"] = True
    report = run_cms_queue(tmp_path, source_items=[item])
    assert report["pass"] is True
    assert (tmp_path / "articles/sample.html").is_file()
    assert (tmp_path / "factory/output/cms/release_queue.json").is_file()
    assert (tmp_path / "factory/output/analytics/content_queue.json").is_file()
    assert (tmp_path / "factory/output/revenue/content_queue.json").is_file()
