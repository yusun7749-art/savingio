from pathlib import Path
import json

from factory.pm_console import load_pool, select_topics, run_articles


def _root() -> Path:
    return Path(__file__).resolve().parents[2]


def test_auto_topic_pool_has_at_least_twenty_topics():
    assert len(load_pool(_root())) >= 20


def test_select_topics_returns_unique_slugs():
    selected = select_topics(_root(), 5)
    assert len(selected) == 5
    assert len({item.slug for item in selected}) == 5


def test_dry_run_writes_report_without_generating_articles(tmp_path):
    root = _root()
    report = run_articles(root, 2, dry_run=True)
    assert report["pass"] is True
    assert len(report["selected"]) == 2
    assert report["completed"] == []
    output = root / "factory/output/pm_factory_report.json"
    payload = json.loads(output.read_text(encoding="utf-8"))
    assert payload["mode"] == "articles"
