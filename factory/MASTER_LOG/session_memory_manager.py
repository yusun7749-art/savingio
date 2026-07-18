#!/usr/bin/env python3
"""Savingio MASTER_LOG session memory manager.

Stores conversation/work-session decisions under MASTER_LOG without replacing
existing Factory runtime logs.
"""
from __future__ import annotations

import argparse
from datetime import datetime, timezone, timedelta
from pathlib import Path

KST = timezone(timedelta(hours=9))
BASE = Path(__file__).resolve().parent


def stamp():
    now = datetime.now(KST)
    return now.strftime('%Y-%m-%d %H:%M')


def append_session(summary: str, decision: str = '', next_step: str = ''):
    path = BASE / 'SESSION_TIMELINE.md'
    text = f"""
\n## {stamp()} KST

- 작업:
  {summary}
- 결정:
  {decision or '없음'}
- 다음:
  {next_step or '다음 요청'}
"""
    with path.open('a', encoding='utf-8') as f:
        f.write(text)
    return path


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--summary', required=True)
    p.add_argument('--decision', default='')
    p.add_argument('--next', dest='next_step', default='')
    args = p.parse_args()
    print(append_session(args.summary, args.decision, args.next_step))


if __name__ == '__main__':
    main()
