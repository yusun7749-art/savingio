from __future__ import annotations
import json, os, subprocess
from datetime import datetime
from pathlib import Path
from typing import Any, Iterable

PUBLISHER_ID = "pub-7605193583747751"
VALID_STATUS = {"VERIFIED","IMPLEMENTED","FAILED","NOT RUN","PLANNED","PARTIAL"}

def now_iso() -> str:
    return datetime.now().astimezone().isoformat(timespec="seconds")

def _atomic_write(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(content, encoding="utf-8", newline="\n")
    os.replace(tmp, path)

def _append(path: Path, content: str) -> None:
    old = path.read_text(encoding="utf-8") if path.exists() else ""
    if old and not old.endswith("\n"):
        old += "\n"
    _atomic_write(path, old + content.rstrip() + "\n")

def _git(root: Path, *args: str) -> str:
    try:
        p = subprocess.run(["git",*args], cwd=root, capture_output=True, text=True,
                           encoding="utf-8", errors="replace", check=False)
        return p.stdout.strip() if p.returncode == 0 else ""
    except OSError:
        return ""

def ensure_master_log(root: Path) -> Path:
    root = root.resolve()
    base = root / "factory" / "MASTER_LOG"
    base.mkdir(parents=True, exist_ok=True)
    files = {
        "MASTER_LOG_INDEX.md": "# Savingio Factory MASTER LOG INDEX\n\n- CURRENT: 현재 상태\n- PART1: 실행 기록\n- PART2: 아이디어·결정\n- PART3: 테스트·QA\n\nPublisher ID LOCK: pub-7605193583747751\n",
        "MASTER_LOG_CURRENT.md": "# Savingio Factory CURRENT\n\n- 상태: PLANNED\n- Active Item: MASTER LOG 자동 누적\n",
        "MASTER_LOG_PART1.md": "# Savingio Factory MASTER LOG PART 1\n\n",
        "MASTER_LOG_PART1-1.md": "# Savingio Factory MASTER LOG PART 1-1\n\n",
        "MASTER_LOG_PART2.md": "# Savingio Factory MASTER LOG PART 2\n\n## PB-033 Rollback Engine\n- 상태: DESIGNED\n\n## PB-034 GitHub First\n- 상태: IMPLEMENTED\n\n## PB-035 Active Item 고정\n- 상태: IMPLEMENTED\n\n## PB-036 Connector 권한/실행 구분\n- 상태: IMPLEMENTED\n\n## PB-037 PASS 증거 규칙\n- 상태: IMPLEMENTED\n",
        "MASTER_LOG_PART3.md": "# Savingio Factory MASTER LOG PART 3\n\n",
    }
    for name, content in files.items():
        p = base / name
        if not p.exists():
            _atomic_write(p, content)
    defaults = {
        "ACTIVE_TASK.json": {"project":"savingio-live","publisher_id":PUBLISHER_ID,"status":"PLANNED","active_item":"MASTER LOG 자동 누적"},
        "TODO_QUEUE.json": {"items":[{"priority":1,"task":"Research → QA2 → Approval → Publish Blocker 해결","status":"PLANNED"}]},
        "BLOCKER.json": {"active":True,"blocker":"Research evidence 0 → QA2/Approval blocked"},
        "PROJECT_BRAIN.json": {"project":"Savingio Factory","master_project":"savingio-live","publisher_id_lock":PUBLISHER_ID,"rule":"문제 발견 → 실제 확인 → 프로그램 수정 → 자동 적용 → 기록"},
    }
    for name, payload in defaults.items():
        p = base / name
        if not p.exists():
            _atomic_write(p, json.dumps(payload, ensure_ascii=False, indent=2)+"\n")
    return base

def record_execution(root: Path, *, task: str, status: str, changed_files: Iterable[str]=(),
                     tests: dict[str,Any]|None=None, blocker: str|None=None,
                     next_step: str|None=None, details: dict[str,Any]|None=None) -> dict[str,Any]:
    root = root.resolve()
    base = ensure_master_log(root)
    tests = tests or {}
    details = details or {}
    changed = sorted({str(x).replace("\\","/") for x in changed_files if str(x).strip()})
    normalized = status.upper()
    if normalized not in VALID_STATUS:
        normalized = "FAILED"
    if normalized in {"VERIFIED","IMPLEMENTED"} and not (changed or tests.get("pass") is True):
        normalized = "PARTIAL"
        details["status_downgrade_reason"] = "실제 수정 파일 또는 성공 테스트 증거 없음"
    ts = now_iso()
    branch = _git(root,"branch","--show-current")
    head = _git(root,"rev-parse","--short","HEAD")
    entry = {"timestamp":ts,"task":task,"status":normalized,"changed_files":changed,"tests":tests,
             "blocker":blocker,"next_step":next_step,"git_branch":branch,"git_head":head,
             "publisher_id":PUBLISHER_ID,"details":details}
    with (base/"execution_history.jsonl").open("a",encoding="utf-8",newline="\n") as f:
        f.write(json.dumps(entry,ensure_ascii=False)+"\n")
    _atomic_write(base/"ACTIVE_TASK.json", json.dumps(entry,ensure_ascii=False,indent=2)+"\n")
    _atomic_write(base/"BLOCKER.json", json.dumps({"active":bool(blocker),"blocker":blocker,"updated_at":ts},ensure_ascii=False,indent=2)+"\n")
    _atomic_write(base/"MASTER_LOG_CURRENT.md",
        f"# Savingio Factory CURRENT\n\n- MASTER PROJECT: savingio-live\n- Publisher ID LOCK: {PUBLISHER_ID}\n- 마지막 갱신: {ts}\n- 상태: {normalized}\n- Active Item: {task}\n- Git: {branch or 'UNKNOWN'} / {head or 'UNKNOWN'}\n- 수정 파일: {len(changed)}개\n- 테스트: {json.dumps(tests,ensure_ascii=False)}\n- 현재 Blocker: {blocker or '없음'}\n- 다음 시작 위치: {next_step or 'MASTER_LOG_CURRENT 확인 후 진행'}\n")
    changed_md = "\n".join(f"  - `{x}`" for x in changed) or "  - 없음"
    block = f"\n## {ts} · {task}\n- 상태: **{normalized}**\n- Git: `{branch or 'UNKNOWN'}` / `{head or 'UNKNOWN'}`\n- 수정 파일:\n{changed_md}\n- 테스트: `{json.dumps(tests,ensure_ascii=False)}`\n- Blocker: {blocker or '없음'}\n- 다음 시작 위치: {next_step or '미지정'}\n"
    _append(base/"MASTER_LOG_PART1.md", block)
    _append(base/"MASTER_LOG_PART1-1.md", block)
    _append(base/"MASTER_LOG_PART3.md", f"\n## {ts} · {task}\n- 판정: **{normalized}**\n- 테스트 증거: `{json.dumps(tests,ensure_ascii=False)}`\n")
    return entry

def record_command_result(root: Path, command_file: str, result: dict[str,Any]) -> dict[str,Any]:
    compile_result = result.get("python_compile") or {}
    ok = result.get("status") == "success" and compile_result.get("pass") is True
    return record_execution(root, task=f"Command Factory: {command_file}",
        status="VERIFIED" if ok else "FAILED",
        changed_files=result.get("changed_files") or (),
        tests=compile_result,
        blocker=None if ok else result.get("error") or "Command Factory 실행 실패",
        next_step="다음 command.json 처리" if ok else "실패 원인 수정 후 같은 command 재실행",
        details={"command_result":result})
