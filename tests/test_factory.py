from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "factory"))

from planner import plan
from qa import audit_html
from researcher import build_research_brief
from writer import build_draft


def test_plan_detects_saving_type():
    assert plan("전기요금 절약 방법")["article_type"] == "절약형"


def test_draft_is_not_publishable():
    p = plan("전기요금 절약 방법")
    research = build_research_brief(p)
    draft = build_draft(p, research)
    report = audit_html(f"<h1>{draft['title']}</h1>{draft['body_html']}")
    assert report["status"] == "FAIL"
    assert report["placeholders"]


def test_good_minimal_html_has_single_h1():
    html = "<h1>제목</h1>" + "".join(f"<h2>섹션 {i}</h2><p>내용입니다.</p>" for i in range(10))
    assert audit_html(html)["checks"]["h1_single"] is True
