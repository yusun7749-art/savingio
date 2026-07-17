#!/usr/bin/env python3
"""Savingio Factory MASTER_LOG manager.

Adds the same work report to the internal log set and refreshes CURRENT.
"""
from __future__ import annotations
import argparse
from datetime import datetime, timezone, timedelta
from pathlib import Path

KST = timezone(timedelta(hours=9))
BASE = Path(__file__).resolve().parent


def stamp():
    now = datetime.now(KST)
    return now.strftime("%Y-%m-%d"), now.strftime("%H:%M")


def append(path: Path, text: str) -> None:
    with path.open("a", encoding="utf-8", newline="\n") as f:
        f.write(text.rstrip() + "\n")


def record(args):
    date, time = stamp()
    status = args.status.upper()
    append(BASE / "MASTER_LOG_PART1-1.md", f"\n### {time} KST\n- 작업: {args.summary}\n- 상태: {status}\n")
    append(BASE / "MASTER_LOG_PART2.md", f"\n## {date} {time} KST\n- 구현/수정: {args.summary}\n- 수정 파일: {args.files or '기록 없음'}\n- 상태: {status}\n")
    append(BASE / "MASTER_LOG_PART3.md", f"\n## {date} {time} KST\n- 테스트: {args.tests or 'NOT RUN'}\n- 상태: {status}\n")
    current = f"""# MASTER LOG CURRENT\n\n최종 갱신: {date} {time} KST\n\n- 현재 상태: {status}\n- 마지막 완료/시도: {args.summary}\n- 다음 시작 위치: {args.next or '다음 요청'}\n- Blocker: {args.blocker or '없음'}\n- 수정 파일: {args.files or '기록 없음'}\n- 테스트: {args.tests or 'NOT RUN'}\n- 공식 Publisher ID: `pub-7605193583747751` (LOCK)\n"""
    (BASE / "MASTER_LOG_CURRENT.md").write_text(current, encoding="utf-8")
    print(f"MASTER_LOG updated: {date} {time} KST / {status}")


def status(_args):
    required = ["MASTER_LOG_INDEX.md", "MASTER_LOG_CURRENT.md", "MASTER_LOG_PART1.md", "MASTER_LOG_PART1-1.md", "MASTER_LOG_PART2.md", "MASTER_LOG_PART3.md"]
    missing = [n for n in required if not (BASE/n).exists()]
    if missing:
        print("FAIL: missing " + ", ".join(missing)); raise SystemExit(1)
    print("PASS: MASTER_LOG structure ready")


def main():
    p=argparse.ArgumentParser()
    sub=p.add_subparsers(dest="cmd", required=True)
    r=sub.add_parser("record")
    r.add_argument("--summary", required=True)
    r.add_argument("--status", default="IMPLEMENTED", choices=["VERIFIED","IMPLEMENTED","FAILED","NOT RUN","PLANNED"])
    r.add_argument("--files", default="")
    r.add_argument("--tests", default="")
    r.add_argument("--next", default="")
    r.add_argument("--blocker", default="")
    r.set_defaults(func=record)
    s=sub.add_parser("status"); s.set_defaults(func=status)
    a=p.parse_args(); a.func(a)
if __name__ == "__main__": main()
