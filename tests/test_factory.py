from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from factory.planner import build_plan
from factory.qa import evaluate
from factory.researcher import build_research_package
from factory.writer import generate_article
from factory.seo import build_seo

CONFIG = ROOT / 'factory' / 'config'

def test_plan_detects_saving_type():
    result = build_plan('전기요금 절약 방법', CONFIG)
    assert result['article_type']
    assert result['topic'] == '전기요금 절약 방법'

def test_unverified_research_is_not_publishable():
    plan = build_plan('전기요금 절약 방법', CONFIG)
    research = build_research_package(plan, CONFIG)
    assert research['ready_for_publish'] is False
    assert research['research_status'] == 'verification_required'

def test_generated_article_has_single_h1_and_qa_runs():
    plan = build_plan('전기요금 절약 방법', CONFIG)
    research = build_research_package(plan, CONFIG)
    seo = build_seo(plan, CONFIG)
    html = generate_article(plan, research, seo, [], CONFIG)
    report = evaluate(html, plan, research, seo, CONFIG)
    assert html.lower().count('<h1') == 1
    assert isinstance(report['pass'], bool)

from factory.department_contract_validator import validate_department_packet
from factory.house_integrity import audit_house
from factory.automation_completion import _clean_topics


def test_department_contract_rejects_missing_fields():
    report = validate_department_packet("planning", {"topic": "테스트"}, CONFIG)
    assert report["pass"] is False
    assert "slug" in report["missing_fields"]


def test_clean_topics_deduplicates_and_normalizes():
    assert _clean_topics(["  전기요금   절약 ", "전기요금 절약", "", "수도요금"]) == [
        "전기요금 절약", "수도요금"
    ]


def test_house_integrity_detects_nested_house(tmp_path):
    for name in ("factory", "articles", "calculators", "css", "js"):
        (tmp_path / name).mkdir(parents=True, exist_ok=True)
    (tmp_path / "index.html").write_text("ok", encoding="utf-8")
    nested = tmp_path / "savingio-live"
    (nested / "factory").mkdir(parents=True)
    (nested / "articles").mkdir()
    report = audit_house(tmp_path, write_report=False)
    assert report["pass"] is False
    assert "savingio-live" in report["nested_houses"]

from factory.house_integrity import repair_nested_houses


def test_house_repair_moves_nested_house_without_deleting(tmp_path):
    for name in ("factory", "articles", "calculators", "css", "js"):
        (tmp_path / name).mkdir(parents=True, exist_ok=True)
    (tmp_path / "index.html").write_text("ok", encoding="utf-8")
    nested = tmp_path / "savingio-live"
    (nested / "factory").mkdir(parents=True)
    (nested / "articles").mkdir()
    (nested / "marker.txt").write_text("preserve", encoding="utf-8")
    result = repair_nested_houses(tmp_path)
    assert result["pass"] is True
    assert not nested.exists()
    target = tmp_path / result["moved"][0]["target"]
    assert (target / "marker.txt").read_text(encoding="utf-8") == "preserve"
