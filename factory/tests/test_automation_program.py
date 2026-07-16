from pathlib import Path
import json

from factory.automation_program import AutomationOptions, FactoryAutomationProgram

ROOT = Path(__file__).resolve().parents[2]


def test_preflight_passes_for_master_house():
    result = FactoryAutomationProgram(ROOT).preflight()
    assert result["pass"] is True
    assert result["missing"] == []


def test_topic_normalization_deduplicates_and_ignores_comments():
    topics = FactoryAutomationProgram.normalize_topics([
        " 전기요금   절약 ", "전기요금 절약", "# comment", "", "수도요금 절약"
    ])
    assert topics == ["전기요금 절약", "수도요금 절약"]


def test_json_topic_file(tmp_path):
    path = tmp_path / "topics.json"
    path.write_text(json.dumps({"topics": ["전기요금 절약", "전기요금 절약", "통신비 절약"]}, ensure_ascii=False), encoding="utf-8")
    program = FactoryAutomationProgram(ROOT)
    assert program.topics_from_file(path) == ["전기요금 절약", "통신비 절약"]


def test_plan_builds_multiple_department_plans(tmp_path):
    program = FactoryAutomationProgram(ROOT)
    result = program.plan(["전기요금 절약", "자동차 보험료 절약"])
    assert result["count"] == 2
    assert all(item["status"] == "planned" for item in result["plans"])


def test_checkpoint_roundtrip(tmp_path):
    root = tmp_path / "house"
    (root / "factory" / "output" / "automation").mkdir(parents=True)
    program = FactoryAutomationProgram(root)
    program._save_checkpoint({"주제1"}, [{"topic": "주제1", "status": "completed"}])
    loaded = program._load_checkpoint()
    assert loaded["completed_topics"] == ["주제1"]
    program.reset_checkpoint()
    assert not program.checkpoint_path.exists()


def test_options_are_safe_by_default():
    options = AutomationOptions()
    assert options.publish is False
    assert options.stage is True
    assert options.continue_on_error is True
