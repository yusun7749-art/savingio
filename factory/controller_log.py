from __future__ import annotations

from pathlib import Path

from .utils import now_iso


class ControllerLogger:
    def __init__(self, root: Path) -> None:
        self.path = root.resolve() / "factory" / "output" / "controller.log"
        self.path.parent.mkdir(parents=True, exist_ok=True)

    def write(self, event: str, detail: str = "") -> None:
        suffix = f" | {detail}" if detail else ""
        with self.path.open("a", encoding="utf-8") as fp:
            fp.write(f"{now_iso()} | {event}{suffix}\n")
