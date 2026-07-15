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
