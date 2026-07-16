from __future__ import annotations


def show(step: int, total: int, label: str, status: str = "RUNNING") -> None:
    print(f"[{step}/{total}] {label} - {status}", flush=True)
