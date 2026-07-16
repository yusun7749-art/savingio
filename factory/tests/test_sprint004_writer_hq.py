from __future__ import annotations

import json
from pathlib import Path

from factory.writer_hq import run_writer_queue


def _write(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")


def _config(root: Path) -> None:
    _write(root / "factory/config/seo_rules.json", {
        "title_suffix": " 총정리",
        "title_max": 60,
        "description_max": 160,
        "site_url": "https://savingio.com",
    })
    _write(root / "factory/config/article_dna.json", {"version": "test"})


def test_writer_hq_creates_verified_draft_and_seo_queue(tmp_path: Path, monkeypatch) -> None:
    monkeypatch.chdir(tmp_path)
    _config(tmp_path)
    (tmp_path / "articles").mkdir()
    research_dir = tmp_path / "factory/output/research/items/long-term-repair-reserve"
    package = {
        "topic": "장기수선충당금 반환받는 방법",
        "article_type": "guide",
        "evidence": [],
        "evidence_score": 0,
        "ready_for_publish": False,
    }
    _write(research_dir / "research_package.json", package)
    item = {
        "order": 1,
        "topic": "장기수선충당금 반환받는 방법",
        "slug": "long-term-repair-reserve",
        "category": "주거비",
        "article_type": "guide",
        "search_intent": "informational",
        "research_files": {
            "package": "factory/output/research/items/long-term-repair-reserve/research_package.json"
        },
    }
    _write(tmp_path / "factory/output/research/writer_queue.json", {
        "department": "writer", "status": "ready", "pending": [item], "completed": [], "failed": []
    })

    report = run_writer_queue(tmp_path)

    assert report["pass"] is True
    assert report["completed_count"] == 1
    draft = tmp_path / "factory/output/drafts/long-term-repair-reserve.html"
    assert draft.is_file()
    html = draft.read_text(encoding="utf-8")
    assert "장기수선충당금 반환받는 방법" in html
    assert "<h1" in html
    seo_queue = json.loads((tmp_path / "factory/output/writer/seo_queue.json").read_text(encoding="utf-8"))
    assert len(seo_queue["pending"]) == 1
    assert seo_queue["pending"][0]["html_bytes"] > 0


def test_writer_hq_rejects_empty_queue(tmp_path: Path, monkeypatch) -> None:
    monkeypatch.chdir(tmp_path)
    _write(tmp_path / "factory/output/research/writer_queue.json", {
        "department": "writer", "status": "ready", "pending": [], "completed": [], "failed": []
    })
    try:
        run_writer_queue(tmp_path)
    except ValueError as exc:
        assert "작성할 조사 완료 주제가 없습니다" in str(exc)
    else:
        raise AssertionError("ValueError expected")
