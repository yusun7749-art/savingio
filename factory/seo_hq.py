from __future__ import annotations

import json
import re
from html import escape
from pathlib import Path

from .qa import evaluate
from .seo import build_seo
from .utils import now_iso, save_json

INPUT_QUEUE = Path('factory/output/writer/seo_queue.json')
REPORT_PATH = Path('factory/output/seo/seo_hq_report.json')
OUTPUT_QUEUE = Path('factory/output/seo/image_queue.json')
ITEMS_DIR = Path('factory/output/seo/items')


def _load(path: Path) -> dict:
    if not path.is_file():
        raise FileNotFoundError(f'필수 파일이 없습니다: {path}')
    data = json.loads(path.read_text(encoding='utf-8'))
    if not isinstance(data, dict):
        raise ValueError(f'JSON 객체가 필요합니다: {path}')
    return data


def _replace_once(pattern: str, replacement: str, html: str) -> str:
    updated, count = re.subn(pattern, replacement, html, count=1, flags=re.I | re.S)
    if count != 1:
        raise ValueError(f'HTML SEO 태그를 찾지 못했습니다: {pattern}')
    return updated


def _apply_seo(html: str, seo: dict) -> str:
    html = _replace_once(r'<title>.*?</title>', f'<title>{escape(seo["title"])}</title>', html)
    html = _replace_once(
        r'<meta\s+name=["\']description["\']\s+content=["\'].*?["\']\s*/?>',
        f'<meta name="description" content="{escape(seo["description"], quote=True)}">', html,
    )
    html = _replace_once(
        r'<link\s+rel=["\']canonical["\']\s+href=["\'].*?["\']\s*/?>',
        f'<link rel="canonical" href="{escape(seo["canonical"], quote=True)}">', html,
    )
    schema = json.dumps(seo['schema'], ensure_ascii=False)
    html = _replace_once(
        r'<script\s+type=["\']application/ld\+json["\']>.*?</script>',
        f'<script type="application/ld+json">{schema}</script>', html,
    )
    return html


def run_seo_queue(root: Path, limit: int | None = None) -> dict:
    root = root.resolve()
    queue = _load(root / INPUT_QUEUE)
    pending = list(queue.get('pending', []))
    if limit is not None:
        if limit < 1:
            raise ValueError('limit must be at least 1')
        pending = pending[:limit]
    if not pending:
        raise ValueError('SEO 처리할 글이 없습니다.')

    completed, failed, image_pending = [], [], []
    config_dir = root / 'factory/config'

    for item in pending:
        slug = str(item.get('slug', '')).strip()
        topic = str(item.get('topic', '')).strip()
        try:
            if not slug or not topic:
                raise ValueError('topic 또는 slug 누락')
            draft_rel = str(item.get('draft_path', '')).strip()
            if not draft_rel:
                raise ValueError('draft_path 누락')
            draft_path = root / draft_rel
            if not draft_path.is_file():
                raise FileNotFoundError(draft_path)
            html = draft_path.read_text(encoding='utf-8')
            plan = {
                'topic': topic,
                'slug': slug,
                'category': str(item.get('category', '생활비 절약')),
                'article_type': str(item.get('article_type', 'guide')),
            }
            seo = build_seo(plan, config_dir)
            html = _apply_seo(html, seo)
            draft_path.write_text(html, encoding='utf-8')

            research_rel = str((item.get('research_files') or {}).get('package', ''))
            research = _load(root / research_rel) if research_rel else {'ready_for_publish': False}
            qa = evaluate(html, plan, research, seo, config_dir)

            item_dir = root / ITEMS_DIR / slug
            item_dir.mkdir(parents=True, exist_ok=True)
            save_json(item_dir / 'seo.json', seo)
            save_json(item_dir / 'seo_qa.json', qa)
            result = {
                **item,
                'status': 'ready' if qa['pass'] else 'review',
                'seo_path': (item_dir / 'seo.json').relative_to(root).as_posix(),
                'seo_qa_path': (item_dir / 'seo_qa.json').relative_to(root).as_posix(),
                'seo_score': qa['score'],
                'seo_pass': qa['pass'],
                'completed_at': now_iso(),
            }
            completed.append(result)
            image_pending.append(result)
        except Exception as exc:
            failed.append({**item, 'status': 'failed', 'error': f'{type(exc).__name__}: {exc}', 'failed_at': now_iso()})

    processed = {str(x.get('slug')) for x in completed + failed}
    remaining = [x for x in queue.get('pending', []) if str(x.get('slug')) not in processed]
    queue['pending'] = remaining
    queue['completed'] = list(queue.get('completed', [])) + completed
    queue['failed'] = list(queue.get('failed', [])) + failed
    queue['status'] = 'completed' if not remaining and not failed else ('partial' if completed else 'failed')
    queue['updated_at'] = now_iso()
    save_json(root / INPUT_QUEUE, queue)

    created = now_iso()
    next_queue = {
        'department': 'image', 'status': 'ready' if image_pending else 'blocked',
        'created_at': created, 'pending': image_pending, 'completed': [], 'failed': [],
    }
    report = {
        'department': 'seo',
        'status': 'completed' if completed and not failed else ('partial' if completed else 'failed'),
        'requested': len(pending), 'completed_count': len(completed), 'failed_count': len(failed),
        'image_ready_count': len(image_pending), 'created_at': created,
        'items': completed, 'failures': failed,
        'handoff': {'next_department': 'image', 'queue_path': OUTPUT_QUEUE.as_posix()},
        'pass': bool(completed) and not failed,
    }
    save_json(root / REPORT_PATH, report)
    save_json(root / OUTPUT_QUEUE, next_queue)
    return report
