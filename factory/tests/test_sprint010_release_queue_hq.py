from __future__ import annotations

import json
from pathlib import Path

from factory.release_queue_hq import run_release_queue


def write_json(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False), encoding='utf-8')


def prepare(root: Path) -> None:
    article = root / 'articles' / 'sample.html'
    article.parent.mkdir(parents=True, exist_ok=True)
    article.write_text('<html><body>sample</body></html>', encoding='utf-8')
    write_json(root / 'factory/output/cms/release_queue.json', {
        'department': 'release', 'status': 'ready',
        'pending': [{'slug': 'sample', 'article_path': 'articles/sample.html'}],
        'completed': [], 'failed': [],
    })


def test_release_queue_dry_run_handoff(tmp_path: Path) -> None:
    prepare(tmp_path)
    calls = []

    def fake_pipeline(root: Path, **kwargs):
        calls.append(kwargs)
        return {'status': 'dry_run', 'pass': True}

    report = run_release_queue(tmp_path, execute=False, pipeline_runner=fake_pipeline)
    assert report['pass'] is True
    assert report['status'] == 'validated'
    assert report['candidate_files'] == ['articles/sample.html']
    assert calls[0]['candidates'] == ['articles/sample.html']
    analytics = json.loads((tmp_path / 'factory/output/analytics/content_queue.json').read_text(encoding='utf-8'))
    revenue = json.loads((tmp_path / 'factory/output/revenue/content_queue.json').read_text(encoding='utf-8'))
    assert analytics['status'] == 'ready'
    assert revenue['status'] == 'waiting_for_analytics'


def test_release_queue_execute_marks_released(tmp_path: Path) -> None:
    prepare(tmp_path)
    report = run_release_queue(
        tmp_path,
        execute=True,
        pipeline_runner=lambda root, **kwargs: {'status': 'completed', 'pass': True},
    )
    assert report['status'] == 'completed'
    assert report['items'][0]['status'] == 'released'
    queue = json.loads((tmp_path / 'factory/output/cms/release_queue.json').read_text(encoding='utf-8'))
    assert queue['pending'] == []
    assert queue['completed'][0]['status'] == 'released'


def test_release_queue_blocks_missing_article(tmp_path: Path) -> None:
    write_json(tmp_path / 'factory/output/cms/release_queue.json', {
        'pending': [{'slug': 'missing', 'article_path': 'articles/missing.html'}],
        'completed': [], 'failed': [],
    })
    report = run_release_queue(tmp_path, pipeline_runner=lambda root, **kwargs: {'pass': True})
    assert report['pass'] is False
    assert report['status'] == 'blocked'
    assert report['failed_count'] == 1
