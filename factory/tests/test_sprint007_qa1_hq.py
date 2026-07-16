from __future__ import annotations

import json
from pathlib import Path

import factory.qa1_hq as qa1_hq
from factory.qa1_hq import run_qa1_queue


def _write_json(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def test_qa1_hq_creates_report_and_qa2_handoff(tmp_path: Path, monkeypatch) -> None:
    draft = tmp_path / "factory/output/drafts/sample.html"
    draft.parent.mkdir(parents=True, exist_ok=True)
    draft.write_text("<!doctype html><html lang=\"ko\"><h1>sample</h1></html>", encoding="utf-8")
    seo = tmp_path / "factory/output/seo/items/sample/seo.json"
    _write_json(seo, {"title": "제목", "description": "설명", "canonical": "https://savingio.com/articles/sample.html", "schema": {"@type": "Article"}})
    research = tmp_path / "factory/output/research/items/sample/research_package.json"
    _write_json(research, {"ready_for_publish": True})
    item = {
        "topic": "샘플",
        "slug": "sample",
        "draft_path": draft.relative_to(tmp_path).as_posix(),
        "seo_path": seo.relative_to(tmp_path).as_posix(),
        "research_files": {"package": research.relative_to(tmp_path).as_posix()},
        "image_ready": False,
    }
    monkeypatch.setattr(qa1_hq, "evaluate", lambda *args, **kwargs: {
        "score": 98, "pass": True, "issues": [], "checks": [], "critical_failures": []
    })

    report = run_qa1_queue(tmp_path, source_items=[item])

    assert report["pass"] is True
    assert report["passed_count"] == 1
    assert report["items"][0]["image_status"] == "pending_external_generation"
    assert (tmp_path / report["items"][0]["qa1_path"]).is_file()
    queue = json.loads((tmp_path / "factory/output/qa1/qa2_queue.json").read_text(encoding="utf-8"))
    assert queue["status"] == "ready"
    assert len(queue["pending"]) == 1


def test_qa1_hq_blocks_failed_content_from_qa2(tmp_path: Path, monkeypatch) -> None:
    draft = tmp_path / "factory/output/drafts/sample.html"
    draft.parent.mkdir(parents=True, exist_ok=True)
    draft.write_text("<html><h1>sample</h1></html>", encoding="utf-8")
    seo = tmp_path / "factory/output/seo/items/sample/seo.json"
    _write_json(seo, {"title": "제목", "description": "설명", "canonical": "https://savingio.com/articles/sample.html", "schema": {}})
    item = {"topic": "샘플", "slug": "sample", "draft_path": draft.relative_to(tmp_path).as_posix(), "seo_path": seo.relative_to(tmp_path).as_posix()}
    monkeypatch.setattr(qa1_hq, "evaluate", lambda *args, **kwargs: {
        "score": 80, "pass": False, "issues": ["text_length"], "checks": [], "critical_failures": []
    })

    report = run_qa1_queue(tmp_path, source_items=[item])

    assert report["pass"] is False
    assert report["review_count"] == 1
    queue = json.loads((tmp_path / "factory/output/qa1/qa2_queue.json").read_text(encoding="utf-8"))
    assert queue["status"] == "blocked"
    assert queue["pending"] == []
