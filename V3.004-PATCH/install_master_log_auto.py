from __future__ import annotations
import re, shutil
from pathlib import Path

def main() -> int:
    root = Path.cwd().resolve()
    target = root / "factory" / "command_watcher.py"
    if not target.exists():
        print("ERROR: Run from savingio-live root; factory/command_watcher.py missing")
        return 2
    backup = target.with_suffix(".py.before-v3.004.bak")
    if not backup.exists():
        shutil.copy2(target, backup)
    src = target.read_text(encoding="utf-8")
    imp = "from .master_log_runtime import record_command_result\n"
    marker = "from .command_engine import CommandEngine, compile_python, now_iso\n"
    if imp not in src:
        if marker not in src:
            print("ERROR: import marker not found")
            return 3
        src = src.replace(marker, marker + imp, 1)
    if "record_command_result(self.root, claimed.name, result)" not in src:
        pattern = r'(?m)^(\s*)result\["watcher_finished_at"\] = now_iso\(\)\s*$'
        match = re.search(pattern, src)
        if not match:
            print("ERROR: watcher result marker not found")
            return 4
        indent = match.group(1)
        replacement = match.group(0) + "\n" + indent + "record_command_result(self.root, claimed.name, result)"
        src = re.sub(pattern, replacement, src, count=1)
    target.write_text(src, encoding="utf-8", newline="\n")
    from factory.master_log_runtime import ensure_master_log, record_execution
    ensure_master_log(root)
    record_execution(root, task="V3.004 MASTER LOG 자동 누적 엔진 설치",
        status="IMPLEMENTED",
        changed_files=["factory/master_log_runtime.py","factory/command_watcher.py","factory/tests/test_master_log_runtime.py","INSTALL-V3.004-MASTER-LOG-AUTO.bat"],
        tests={"pass":False,"note":"BAT가 pytest/compileall 실행 전 설치 단계"},
        next_step="pytest 및 compileall 실행")
    print("PATCH INSTALLED")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
