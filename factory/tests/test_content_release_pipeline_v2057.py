from pathlib import Path

from factory.content_release_pipeline import finalize_content_result


def _seo():
    return {"slug": "sample-topic", "canonical": "https://savingio.com/articles/sample-topic.html"}


def _qa(passed: bool):
    return {"pass": passed, "score": 100 if passed else 80}


def _research(ready: bool):
    return {"ready_for_publish": ready, "evidence_score": 100 if ready else 40}


def test_blocked_content_stays_in_drafts(tmp_path: Path):
    result = finalize_content_result(
        tmp_path,
        seo=_seo(),
        html="<html>draft</html>",
        qa=_qa(False),
        research=_research(False),
        handoffs=[{"department": "research", "gate": {"pass": False, "blockers": ["evidence"]}}],
    )
    assert result["status"] == "draft_saved_review_required"
    assert (tmp_path / "factory/output/drafts/sample-topic.html").exists()
    assert not (tmp_path / "articles/sample-topic.html").exists()
    assert (tmp_path / "factory/output/content_review_required.json").exists()


def test_ready_content_moves_to_articles_and_queue(tmp_path: Path):
    result = finalize_content_result(
        tmp_path,
        seo=_seo(),
        html="<html>ready</html>",
        qa=_qa(True),
        research=_research(True),
        handoffs=[{"department": "qa_final", "gate": {"pass": True, "blockers": []}}],
    )
    assert result["status"] == "ready_for_release"
    assert (tmp_path / "articles/sample-topic.html").exists()
    assert (tmp_path / "factory/output/cms_release_queue.json").exists()
