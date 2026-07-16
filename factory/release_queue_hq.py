from __future__ import annotations

import json
from pathlib import Path
from typing import Callable

from .release_pipeline import run_pipeline
from .utils import now_iso, save_json

INPUT_QUEUE = Path('factory/output/cms/release_queue.json')
REPORT_PATH = Path('factory/output/release/release_queue_hq_report.json')
ANALYTICS_QUEUE = Path('factory/output/analytics/content_queue.json')
REVENUE_QUEUE = Path('factory/output/revenue/content_queue.json')


def _load(path: Path) -> dict:
    if not path.is_file():
        raise FileNotFoundError(f'필수 파일이 없습니다: {path}')
    payload = json.loads(path.read_text(encoding='utf-8'))
    if not isinstance(payload, dict):
        raise ValueError(f'JSON 객체가 필요합니다: {path}')
    return payload


def _merge_queue(path: Path, *, status: str, items: list[dict], waiting_reason: str | None = None) -> dict:
    if path.is_file():
        try:
            queue = _load(path)
        except (OSError, ValueError, json.JSONDecodeError):
            queue = {}
    else:
        queue = {}
    existing = {str(x.get('slug')): x for x in queue.get('pending', []) if isinstance(x, dict)}
    for item in items:
        existing[str(item.get('slug'))] = item
    queue.update({
        'department': 'analytics' if 'analytics' in path.parts else 'revenue',
        'status': status,
        'updated_at': now_iso(),
        'pending': list(existing.values()),
    })
    if waiting_reason:
        queue['waiting_reason'] = waiting_reason
    else:
        queue.pop('waiting_reason', None)
    save_json(path, queue)
    return queue


def run_release_queue(
    root: Path,
    *,
    execute: bool = False,
    push: bool = True,
    verify_cloudflare: bool = True,
    pipeline_runner: Callable[..., dict] = run_pipeline,
) -> dict:
    """Validate and release CMS-approved article files as one safe scoped release.

    Content creation never calls this function. It is intended only for the
    explicit Release menu. Analytics and revenue queues are activated only
    after the release pipeline reports PASS.
    """
    root = root.resolve()
    queue_path = root / INPUT_QUEUE
    queue = _load(queue_path)
    pending = list(queue.get('pending', []))
    if not pending:
        raise ValueError('Release Queue에 처리할 글이 없습니다.')

    valid: list[dict] = []
    failed: list[dict] = []
    candidates: list[str] = []
    for item in pending:
        slug = str(item.get('slug', '')).strip()
        article_rel = str(item.get('article_path', '')).strip()
        article = root / article_rel if article_rel else None
        if not slug or not article or not article.is_file() or article.stat().st_size <= 0:
            failed.append({**item, 'status': 'failed', 'error': 'article_file_missing_or_empty'})
            continue
        normalized = article.relative_to(root).as_posix()
        candidates.append(normalized)
        valid.append({**item, 'article_path': normalized, 'article_size': article.stat().st_size})

    if failed or not valid:
        report = {
            'department': 'release',
            'status': 'blocked',
            'requested': len(pending),
            'validated_count': len(valid),
            'failed_count': len(failed),
            'items': valid,
            'failures': failed,
            'pass': False,
            'created_at': now_iso(),
        }
        save_json(root / REPORT_PATH, report)
        return report

    message = f"Release {len(valid)} CMS-approved article(s)"
    pipeline = pipeline_runner(
        root,
        execute=execute,
        push=push,
        candidates=candidates,
        commit_message=message,
        include_deletions=False,
        verify_cloudflare=verify_cloudflare,
    )
    released = bool(pipeline.get('pass'))
    completed = [
        {**item, 'status': 'released' if execute else 'release_validated', 'released_at': now_iso()}
        for item in valid
    ] if released else []

    queue['pending'] = [] if released else pending
    queue['completed'] = list(queue.get('completed', [])) + completed
    queue['failed'] = list(queue.get('failed', [])) + ([] if released else failed)
    queue['status'] = ('completed' if execute else 'validated') if released else 'blocked'
    queue['updated_at'] = now_iso()
    save_json(queue_path, queue)

    handoff_items = [
        {'slug': item['slug'], 'article_path': item['article_path'], 'release_status': item['status']}
        for item in completed
    ]
    if released:
        analytics = _merge_queue(root / ANALYTICS_QUEUE, status='ready', items=handoff_items)
        revenue = _merge_queue(
            root / REVENUE_QUEUE,
            status='waiting_for_analytics',
            items=handoff_items,
            waiting_reason='analytics_baseline_required',
        )
    else:
        analytics = _merge_queue(root / ANALYTICS_QUEUE, status='waiting_for_release', items=[])
        revenue = _merge_queue(root / REVENUE_QUEUE, status='waiting_for_release', items=[], waiting_reason='release_not_completed')

    report = {
        'department': 'release',
        'status': queue['status'],
        'mode': 'execute' if execute else 'dry_run',
        'requested': len(pending),
        'validated_count': len(valid),
        'released_count': len(completed),
        'failed_count': len(failed),
        'candidate_files': candidates,
        'pipeline': pipeline,
        'handoff': {
            'analytics_queue': ANALYTICS_QUEUE.as_posix(),
            'analytics_status': analytics.get('status'),
            'revenue_queue': REVENUE_QUEUE.as_posix(),
            'revenue_status': revenue.get('status'),
        },
        'items': completed,
        'failures': failed,
        'pass': released,
        'created_at': now_iso(),
    }
    save_json(root / REPORT_PATH, report)
    return report
