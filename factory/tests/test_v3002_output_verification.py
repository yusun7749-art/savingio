from pathlib import Path
from unittest.mock import patch

import factory.pm_console as pm


def test_version_is_v3002_or_newer():
    assert pm.VERSION in {"V3.002", "V3.003"}


def test_open_output_folder_uses_absolute_existing_directory(tmp_path: Path):
    with patch.object(pm.os, "name", "nt"), patch.object(pm.os, "startfile", create=True) as startfile:
        assert pm.open_output_folder(tmp_path) is True
        expected = (tmp_path / "factory/output/drafts").resolve()
        assert expected.is_dir()
        startfile.assert_called_once_with(str(expected))


def test_run_articles_fails_when_reported_file_is_missing(tmp_path: Path):
    choice = pm.TopicChoice("테스트", "test")
    fake_result = {
        "qa": {"pass": True, "score": 100},
        "cms": {"article_path": "factory/output/drafts/missing.html"},
    }
    with patch.object(pm, "select_topics", return_value=[choice]), patch(
        "factory.content_pipeline.execute_content_only", return_value=fake_result
    ):
        report = pm.run_articles(tmp_path, 1)
    assert report["pass"] is False
    assert report["verified_count"] == 0
    assert len(report["missing_files"]) == 1


def test_run_articles_passes_only_after_real_file_exists(tmp_path: Path):
    choice = pm.TopicChoice("테스트", "test")
    target = tmp_path / "factory/output/drafts/test.html"

    def fake_execute(*args, **kwargs):
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text("<html>ok</html>", encoding="utf-8")
        return {
            "qa": {"pass": True, "score": 100},
            "cms": {"article_path": "factory/output/drafts/test.html"},
        }

    with patch.object(pm, "select_topics", return_value=[choice]), patch(
        "factory.content_pipeline.execute_content_only", side_effect=fake_execute
    ):
        report = pm.run_articles(tmp_path, 1)
    assert report["pass"] is True
    assert report["verified_count"] == 1
    assert report["verified_files"] == ["factory/output/drafts/test.html"]
