from __future__ import annotations

import json
from pathlib import Path

from factory.qa2_hq import run_qa2_queue
from factory.cms_hq import run_cms_queue


def _write_json(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def _approved_item(root: Path) -> dict:
    draft = root / "factory/output/drafts/sample.html"
    draft.parent.mkdir(parents=True, exist_ok=True)
    draft.write_text("<!doctype html><html lang='ko'><h1>샘플</h1></html>", encoding="utf-8")
    seo = root / "factory/output/seo/items/sample/seo.json"
    _write_json(seo, {"title": "샘플", "description": "샘플 설명", "canonical": "https://savingio.com/articles/sample.html"})
    research = root / "factory/output/research/items/sample/research_package.json"
    _write_json(research, {"ready_for_publish": True})
    qa1 = root / "factory/output/qa1/items/sample/qa1.json"
    _write_json(qa1, {"pass": True, "score": 98})
    return {
        "topic": "샘플",
        "slug": "sample",
        "draft_path": draft.relative_to(root).as_posix(),
        "seo_path": seo.relative_to(root).as_posix(),
        "research_files": {"package": research.relative_to(root).as_posix()},
        "qa1_path": qa1.relative_to(root).as_posix(),
        "qa1_pass": True,
        "qa1_score": 98,
        "image_ready": False,
    }


def test_qa2_hands_only_approved_item_to_cms(tmp_path: Path) -> None:
    report = run_qa2_queue(tmp_path, source_items=[_approved_item(tmp_path)])
    assert report["pass"] is True
    assert report["passed_count"] == 1
    queue = json.loads((tmp_path / "factory/output/qa2/cms_queue.json").read_text(encoding="utf-8"))
    assert queue["status"] == "ready"
    assert queue["pending"][0]["qa2_pass"] is True
    assert queue["pending"][0]["image_status"] == "pending_external_generation"


def test_qa2_blocks_missing_research_readiness(tmp_path: Path) -> None:
    item = _approved_item(tmp_path)
    _write_json(tmp_path / item["research_files"]["package"], {"ready_for_publish": False})
    report = run_qa2_queue(tmp_path, source_items=[item])
    assert report["pass"] is False
    assert "research_ready" in report["items"][0]["qa2_blockers"]
    queue = json.loads((tmp_path / "factory/output/qa2/cms_queue.json").read_text(encoding="utf-8"))
    assert queue["status"] == "blocked"


def test_cms_promotes_qa2_approved_draft_and_creates_release_queue(tmp_path: Path) -> None:
    qa2 = run_qa2_queue(tmp_path, source_items=[_approved_item(tmp_path)])
    report = run_cms_queue(tmp_path, source_items=qa2["items"])
    assert report["pass"] is True
    assert (tmp_path / "articles/sample.html").is_file()
    release = json.loads((tmp_path / "factory/output/cms/release_queue.json").read_text(encoding="utf-8"))
    assert release["status"] == "ready"
    assert release["pending"][0]["release_status"] == "content_ready_image_pending"


def test_cms_rejects_unapproved_item(tmp_path: Path) -> None:
    item = _approved_item(tmp_path)
    item["qa2_pass"] = False
    report = run_cms_queue(tmp_path, source_items=[item])
    assert report["pass"] is False
    assert not (tmp_path / "articles/sample.html").exists()
