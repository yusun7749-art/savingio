from __future__ import annotations

import json
from pathlib import Path

from factory.planning_hq import OUTPUT_PATH, QUEUE_PATH, create_plan


def _write_config(root: Path) -> None:
    config = root / "factory/config"
    config.mkdir(parents=True)
    (config / "auto_topic_pool.json").write_text(
        json.dumps({"topics": ["전기요금 절약", "장기수선충당금", "관리비 절약"]}, ensure_ascii=False),
        encoding="utf-8",
    )
    (config / "article_types.json").write_text(
        json.dumps(
            {
                "default_type": "guide",
                "types": {
                    "guide": {
                        "keywords": ["절약", "충당금"],
                        "search_intent": "informational",
                        "audience": "households",
                        "research_questions": ["{topic} 핵심은?"],
                    }
                },
                "categories": {"생활비 절약": ["전기요금", "관리비"], "주거": ["장기수선충당금"]},
            },
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )
    (config / "article_dna.json").write_text(
        json.dumps({"required_sections": ["intro", "faq"], "target_chars": 3000}, ensure_ascii=False),
        encoding="utf-8",
    )


def test_create_plan_writes_handoff_files(tmp_path: Path) -> None:
    _write_config(tmp_path)
    report = create_plan(tmp_path, 2)
    assert report["pass"] is True
    assert report["selected_count"] == 2
    assert (tmp_path / OUTPUT_PATH).is_file()
    queue = json.loads((tmp_path / QUEUE_PATH).read_text(encoding="utf-8"))
    assert queue["status"] == "ready"
    assert len(queue["pending"]) == 2


def test_create_plan_skips_existing_article_slug(tmp_path: Path) -> None:
    _write_config(tmp_path)
    articles = tmp_path / "articles"
    articles.mkdir()
    from factory.planner import build_plan
    slug = build_plan("전기요금 절약", tmp_path / "factory/config")["slug"]
    (articles / f"{slug}.html").write_text("ok", encoding="utf-8")
    report = create_plan(tmp_path, 1)
    assert report["items"][0]["topic"] == "장기수선충당금"


def test_create_plan_rejects_insufficient_topics(tmp_path: Path) -> None:
    _write_config(tmp_path)
    try:
        create_plan(tmp_path, 10)
    except RuntimeError as exc:
        assert "요청 10" in str(exc)
    else:
        raise AssertionError("RuntimeError was not raised")
