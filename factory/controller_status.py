from __future__ import annotations

from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any

from .utils import now_iso, save_json


@dataclass
class DepartmentState:
    name: str
    status: str
    order: int
    updated_at: str
    detail: str = ""


class ControllerStatusStore:
    def __init__(self, root: Path) -> None:
        self.root = root.resolve()
        self.path = self.root / "factory" / "output" / "controller_status.json"
        self.departments: dict[str, DepartmentState] = {}

    def set(self, name: str, status: str, order: int, detail: str = "") -> None:
        self.departments[name] = DepartmentState(
            name=name,
            status=status,
            order=order,
            updated_at=now_iso(),
            detail=detail,
        )
        self.flush()

    def flush(self) -> None:
        payload: dict[str, Any] = {
            "updated_at": now_iso(),
            "departments": [
                asdict(item)
                for item in sorted(self.departments.values(), key=lambda x: x.order)
            ],
        }
        save_json(self.path, payload)
