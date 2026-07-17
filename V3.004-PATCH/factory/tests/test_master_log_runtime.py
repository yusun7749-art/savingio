from pathlib import Path
import json
from factory.master_log_runtime import ensure_master_log, record_execution

def test_master_log_files_created(tmp_path: Path):
    base = ensure_master_log(tmp_path)
    assert (base/"MASTER_LOG_CURRENT.md").exists()
    assert (base/"MASTER_LOG_PART2.md").exists()
    assert (base/"ACTIVE_TASK.json").exists()

def test_execution_updates_current(tmp_path: Path):
    entry = record_execution(tmp_path, task="테스트", status="VERIFIED",
        changed_files=["factory/a.py"], tests={"pass":True}, next_step="다음")
    assert entry["status"] == "VERIFIED"
    assert "테스트" in (tmp_path/"factory"/"MASTER_LOG"/"MASTER_LOG_CURRENT.md").read_text(encoding="utf-8")
    row = json.loads((tmp_path/"factory"/"MASTER_LOG"/"execution_history.jsonl").read_text(encoding="utf-8").splitlines()[-1])
    assert row["task"] == "테스트"

def test_verified_requires_evidence(tmp_path: Path):
    assert record_execution(tmp_path, task="증거 없음", status="VERIFIED")["status"] == "PARTIAL"
