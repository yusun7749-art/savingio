from __future__ import annotations

import json
from pathlib import Path

from factory.writer import generate_article
from factory.writer_dna import load_writer_rules, validate_writer_html
from factory.writer_hq import run_writer_queue


def _write(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def _config(root: Path) -> None:
    config = root / "factory/config"
    config.mkdir(parents=True, exist_ok=True)
    _write(config / "seo_rules.json", {
        "site_url": "https://savingio.com",
        "title_max": 60,
        "description_min": 50,
        "description_max": 155,
        "title_suffix": "",
    })
    _write(config / "article_dna.json", {"version": "writer-hq-1.0"})


def test_writer_renderer_meets_article_dna(tmp_path: Path) -> None:
    _config(tmp_path)
    plan = {
        "topic": "장기수선충당금 반환받는 방법",
        "slug": "long-term-repair-reserve-refund",
        "category": "주거비",
        "article_type": "procedure",
        "search_intent": "informational",
    }
    seo = {
        "title": "장기수선충당금 반환받는 방법 | Savingio",
        "description": "장기수선충당금 반환 대상과 준비 자료, 집주인 요청 순서, 확인해야 할 예외와 증빙 보관 방법을 단계별로 정리합니다.",
        "robots": "index,follow",
        "canonical": "https://savingio.com/articles/long-term-repair-reserve-refund",
        "schema": {"@context": "https://schema.org", "@type": "Article", "headline": "장기수선충당금 반환받는 방법"},
    }
    research = {
        "evidence": [],
        "official_source_candidates": [{"name": "공동주택관리정보시스템", "domain": "k-apt.go.kr"}],
    }
    html = generate_article(plan, research, seo, related=[], config_dir=tmp_path / "factory/config")
    validation = validate_writer_html(html, load_writer_rules(tmp_path / "factory/config"))

    assert validation.passed is True
    assert 3000 <= validation.plaintext_chars <= 5500
    assert validation.score == 100
    assert html.count('class="summary-card"') >= 4
    assert html.count('class="case-card"') >= 3
    assert html.count('class="faq-item"') >= 5
    assert html.count('class="next-question"') >= 5


def test_writer_hq_persists_qa_and_handoff(tmp_path: Path, monkeypatch) -> None:
    monkeypatch.chdir(tmp_path)
    _config(tmp_path)
    (tmp_path / "articles").mkdir()
    package_path = tmp_path / "factory/output/research/items/sample/research_package.json"
    _write(package_path, {
        "topic": "전기요금 절약",
        "article_type": "saving_action",
        "evidence": [],
        "official_source_candidates": [{"name": "한국전력", "domain": "kepco.co.kr"}],
    })
    item = {
        "order": 1,
        "topic": "전기요금 절약",
        "slug": "electricity-saving-sample",
        "category": "공과금",
        "article_type": "saving_action",
        "search_intent": "informational",
        "research_files": {"package": "factory/output/research/items/sample/research_package.json"},
    }
    _write(tmp_path / "factory/output/research/writer_queue.json", {
        "department": "writer", "status": "ready", "pending": [item], "completed": [], "failed": []
    })

    report = run_writer_queue(tmp_path)
    result = report["items"][0]
    qa_path = tmp_path / result["writer_qa_path"]
    seo_queue = json.loads((tmp_path / "factory/output/writer/seo_queue.json").read_text(encoding="utf-8"))
    qa = json.loads(qa_path.read_text(encoding="utf-8"))

    assert report["pass"] is True
    assert result["writer_qa_score"] == 100
    assert 3000 <= result["plaintext_chars"] <= 5500
    assert qa["pass"] is True
    assert seo_queue["status"] == "ready"
    assert seo_queue["pending"][0]["writer_qa_path"] == result["writer_qa_path"]
