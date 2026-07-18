"""
Savingio Factory MASTER LOG Writer

Purpose:
- Append-only writer for MASTER_LOG_CURRENT.md
- Never edits existing log history
- Adds new work records at the bottom
"""

from datetime import datetime
from pathlib import Path
import json


BASE_DIR = Path(__file__).resolve().parent.parent


class MasterLogWriter:
    def __init__(self, config_path=None):
        if config_path is None:
            config_path = BASE_DIR / "factory" / "config" / "master_log_config.json"
        else:
            config_path = Path(config_path)

        config = json.loads(config_path.read_text(encoding="utf-8"))

        log_path = Path(config["log_path"])
        if not log_path.is_absolute():
            log_path = BASE_DIR / log_path

        self.log_path = log_path
        self.auto_commit = config.get("auto_commit", False)

    def append(self, title, status, details=None, next_task=None):
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        block = [
            "",
            "---",
            f"## {timestamp}",
            "",
            f"작업: {title}",
            "",
            f"상태: {status}",
            "",
        ]

        if details:
            block.append("내용:")
            block.extend([f"- {item}" for item in details])
            block.append("")

        if next_task:
            block.append("다음 작업:")
            block.append(f"- {next_task}")

        if not self.log_path.exists():
            raise FileNotFoundError(self.log_path)

        with self.log_path.open("a", encoding="utf-8") as file:
            file.write("\n".join(block) + "\n")

        if self.auto_commit:
            from factory.git_auto_commit import auto_commit
            auto_commit("Factory automatic master log update")
