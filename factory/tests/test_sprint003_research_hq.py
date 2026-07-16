from __future__ import annotations

import json
from pathlib import Path

from factory.research_hq import OUTPUT_PATH, PLANNING_QUEUE_PATH, QUEUE_PATH, run_research_queue


def _write_inputs(root: Path) -> None:
    config = root / "factory/config"
    config.mkdir(parents=True)
    (config / "source_registry.json").write_text(
        json.dumps(
            {
                "freshness_days": 730,
                "sources": [
                    {
                        "name": "정부24",
                        "domain": "gov.kr",
                        "category": "government",
                        "trust_score": 100,
                        "priority": 1,
                        "always_include": True,
                        "keywords": ["지원", "신청"],
                        "query_templates": ['site:{domain} "{topic}"'],
                    }
                ],
            },
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )
    (config / "research_quality_rules.json").write_text(
        json.dumps(
            {
                "minimum_verified_evidence": 0,
                "minimum_official_evidence": 0,
                "minimum_unique_domains": 0,
                "minimum_claims": 0,
                "minimum_fresh_evidence": 0,
                "minimum_questions": 5,
                "minimum_queries": 1,
                "pass_score": 15,
                "critical_checks": [],
            },
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )
    queue = root / PLANNING_QUEUE_PATH
    queue.parent.mkdir(parents=True)
    queue.write_text(
        json.dumps(
            {
                "department": "research",
                "status": "ready",
                "pending": [
                    {
                        "order": 1,
                        "topic": "장기수선충당금 반환",
                        "slug": "long-term-repair-reserve-refund",
                        "category": "주거",
                        "article_type": "guide",
                        "search_intent": "informational",
                    }
                ],
                "completed": [],
                "failed": [],
            },
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )


def test_research_hq_creates_writer_handoff(tmp_path: Path) -> None:
    _write_inputs(tmp_path)
    report = run_research_queue(tmp_path)
    assert report["pass"] is True
    assert report["completed_count"] == 1
    assert report["writer_ready_count"] == 1
    assert (tmp_path / OUTPUT_PATH).is_file()
    writer = json.loads((tmp_path / QUEUE_PATH).read_text(encoding="utf-8"))
    assert writer["status"] == "ready"
    assert writer["pending"][0]["slug"] == "long-term-repair-reserve-refund"
    archived = writer["pending"][0]["research_files"]
    assert archived
    assert all((tmp_path / path).is_file() for path in archived.values())


def test_research_hq_consumes_planning_queue(tmp_path: Path) -> None:
    _write_inputs(tmp_path)
    run_research_queue(tmp_path)
    queue = json.loads((tmp_path / PLANNING_QUEUE_PATH).read_text(encoding="utf-8"))
    assert queue["pending"] == []
    assert len(queue["completed"]) == 1


def test_research_hq_rejects_empty_queue(tmp_path: Path) -> None:
    _write_inputs(tmp_path)
    path = tmp_path / PLANNING_QUEUE_PATH
    payload = json.loads(path.read_text(encoding="utf-8"))
    payload["pending"] = []
    path.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")
    try:
        run_research_queue(tmp_path)
    except ValueError as exc:
        assert "조사할 기획 주제" in str(exc)
    else:
        raise AssertionError("ValueError was not raised")
