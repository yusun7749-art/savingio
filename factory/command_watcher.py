from __future__ import annotations

import argparse
import json
import shutil
import time
from pathlib import Path
from typing import Any

from .command_engine import CommandEngine, compile_python, now_iso


class CommandWatcher:
    def __init__(self, project_root: Path, poll_seconds: float = 1.0):
        self.root = project_root.resolve()
        self.poll_seconds = max(0.2, float(poll_seconds))
        self.base = self.root / "factory-command"
        self.inbox = self.base / "inbox"
        self.processing = self.base / "processing"
        self.processed = self.base / "processed"
        self.failed = self.base / "failed"
        self.output = self.base / "reports"
        for folder in (self.inbox, self.processing, self.processed, self.failed, self.output):
            folder.mkdir(parents=True, exist_ok=True)

    def _claim(self, source: Path) -> Path:
        destination = self.processing / source.name
        if destination.exists():
            destination = self.processing / f"{source.stem}-{int(time.time())}.json"
        source.replace(destination)
        return destination

    def process_once(self) -> list[dict[str, Any]]:
        results: list[dict[str, Any]] = []
        engine = CommandEngine(self.root)
        for source in sorted(self.inbox.glob("*.json")):
            claimed = self._claim(source)
            try:
                result = engine.execute_file(claimed)
                compile_result = compile_python(self.root)
                result["python_compile"] = compile_result
                if result.get("status") == "success" and compile_result.get("pass"):
                    target = self.processed / claimed.name
                    final_status = "success"
                else:
                    target = self.failed / claimed.name
                    final_status = "failed"
                result["status"] = final_status
                result["watcher_finished_at"] = now_iso()
                report = self.output / f"{claimed.stem}-watcher.json"
                report.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
                shutil.move(str(claimed), str(target))
                results.append(result)
            except Exception as exc:
                target = self.failed / claimed.name
                if claimed.exists():
                    shutil.move(str(claimed), str(target))
                results.append({"status": "failed", "error": str(exc), "command_file": source.name, "watcher_finished_at": now_iso()})
        return results

    def run_forever(self) -> None:
        print(f"[WATCHING] {self.inbox}")
        while True:
            self.process_once()
            time.sleep(self.poll_seconds)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Savingio Command Factory V3 watcher")
    parser.add_argument("--root", default=".")
    parser.add_argument("--poll", type=float, default=1.0)
    parser.add_argument("--once", action="store_true")
    args = parser.parse_args(argv)
    watcher = CommandWatcher(Path(args.root), poll_seconds=args.poll)
    if args.once:
        results = watcher.process_once()
        print(json.dumps(results, ensure_ascii=False, indent=2))
        return 0 if all(item.get("status") == "success" for item in results) else 1
    watcher.run_forever()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
