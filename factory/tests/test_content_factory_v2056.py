from pathlib import Path

from factory import factory_brain


def test_factory_brain_reports_saved_draft(monkeypatch, tmp_path: Path):
    def fake_cycle(topic, root, evidence, draft_on_block=False):
        assert draft_on_block is True
        return {
            "workflow_id": "wf-1",
            "status": "blocked",
            "handoff_count": 11,
            "packets": {
                "cms": {
                    "article_path": "factory/output/drafts/sample.html",
                    "qa_score": 100,
                }
            },
        }

    monkeypatch.setattr(factory_brain, "run_automation_cycle", fake_cycle)
    report = factory_brain.run_factory_brain(tmp_path, ["장기수선충당금"])
    item = report["topics"][0]
    assert item["article_path"] == "factory/output/drafts/sample.html"
    assert item["qa_score"] == 100
