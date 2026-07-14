from __future__ import annotations

from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any
import json
import uuid

from .utils import now_iso


@dataclass
class Message:
    id: str
    sender: str
    receiver: str
    event: str
    payload: dict[str, Any]
    correlation_id: str
    created_at: str
    status: str = "queued"


class DepartmentMessageBus:
    """File-backed message bus for department-to-department handoffs."""

    def __init__(self, project_root: Path):
        self.project_root = project_root.resolve()
        self.bus_dir = self.project_root / "factory" / "state" / "message_bus"
        self.inbox_dir = self.bus_dir / "inbox"
        self.archive_dir = self.bus_dir / "archive"
        self.inbox_dir.mkdir(parents=True, exist_ok=True)
        self.archive_dir.mkdir(parents=True, exist_ok=True)

    def publish(
        self,
        sender: str,
        receiver: str,
        event: str,
        payload: dict[str, Any],
        correlation_id: str | None = None,
    ) -> dict[str, Any]:
        message = Message(
            id=uuid.uuid4().hex,
            sender=sender,
            receiver=receiver,
            event=event,
            payload=payload,
            correlation_id=correlation_id or uuid.uuid4().hex,
            created_at=now_iso(),
        )
        target = self.inbox_dir / receiver / f"{message.created_at.replace(':', '-')}-{message.id}.json"
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(json.dumps(asdict(message), ensure_ascii=False, indent=2), encoding="utf-8")
        return asdict(message)

    def pending(self, receiver: str, limit: int = 100) -> list[dict[str, Any]]:
        folder = self.inbox_dir / receiver
        if not folder.exists():
            return []
        rows: list[dict[str, Any]] = []
        for path in sorted(folder.glob("*.json"))[:limit]:
            rows.append(json.loads(path.read_text(encoding="utf-8")))
        return rows

    def acknowledge(self, receiver: str, message_id: str, result: dict[str, Any] | None = None) -> dict[str, Any]:
        folder = self.inbox_dir / receiver
        matches = list(folder.glob(f"*-{message_id}.json")) if folder.exists() else []
        if not matches:
            raise FileNotFoundError(f"message not found: {message_id}")
        source = matches[0]
        payload = json.loads(source.read_text(encoding="utf-8"))
        payload["status"] = "acknowledged"
        payload["acknowledged_at"] = now_iso()
        payload["result"] = result or {}
        target = self.archive_dir / receiver / source.name
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
        source.unlink()
        return payload

    def summary(self) -> dict[str, Any]:
        pending: dict[str, int] = {}
        archived: dict[str, int] = {}
        for folder in self.inbox_dir.iterdir() if self.inbox_dir.exists() else []:
            if folder.is_dir():
                pending[folder.name] = len(list(folder.glob("*.json")))
        for folder in self.archive_dir.iterdir() if self.archive_dir.exists() else []:
            if folder.is_dir():
                archived[folder.name] = len(list(folder.glob("*.json")))
        return {"pending": pending, "archived": archived, "updated_at": now_iso()}
