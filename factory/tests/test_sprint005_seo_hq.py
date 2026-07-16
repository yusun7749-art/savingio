from __future__ import annotations
import json
from pathlib import Path
from factory.seo_hq import run_seo_queue


def _write(path: Path, data: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False), encoding='utf-8')


def _config(root: Path) -> None:
    _write(root/'factory/config/seo_rules.json', {'title_suffix':' 총정리','title_max':60,'description_max':160,'site_url':'https://savingio.com'})
    _write(root/'factory/config/qa_rules.json', {
        'title_max':60,'description_min':20,'description_max':160,'required_section_ids':['three-second-summary','situation-choice','action-steps','faq'],
        'faq_min':3,'internal_link_min':0,'forbidden_placeholders':['TODO'],'minimum_text_chars':100,'pass_score':70
    })


def test_seo_hq_updates_draft_and_handoff(tmp_path: Path, monkeypatch) -> None:
    monkeypatch.chdir(tmp_path); _config(tmp_path)
    draft = tmp_path/'factory/output/drafts/sample.html'; draft.parent.mkdir(parents=True)
    draft.write_text('''<!doctype html><html lang="ko"><head><title>old</title><meta name="description" content="old description old description"><meta name="robots" content="index,follow"><link rel="canonical" href="old"><script type="application/ld+json">{}</script></head><body><h1>제목</h1><section id="three-second-summary"></section><section id="situation-choice"></section><section id="action-steps"><table></table></section><section id="faq"><h3>a</h3><h3>b</h3><h3>c</h3></section><p>공식 근거 입력 대기</p> 충분한 본문 내용입니다. 충분한 본문 내용입니다. 충분한 본문 내용입니다.</body></html>''', encoding='utf-8')
    research=tmp_path/'factory/output/research/items/sample/research_package.json'; _write(research, {'ready_for_publish':False})
    item={'topic':'장기수선충당금 반환받는 방법','slug':'sample','category':'주거비','article_type':'guide','draft_path':'factory/output/drafts/sample.html','research_files':{'package':'factory/output/research/items/sample/research_package.json'}}
    _write(tmp_path/'factory/output/writer/seo_queue.json', {'pending':[item],'completed':[],'failed':[]})
    report=run_seo_queue(tmp_path)
    assert report['pass'] is True and report['completed_count']==1
    html=draft.read_text(encoding='utf-8')
    assert 'https://savingio.com/articles/sample.html' in html
    assert (tmp_path/'factory/output/seo/items/sample/seo.json').is_file()
    q=json.loads((tmp_path/'factory/output/seo/image_queue.json').read_text(encoding='utf-8'))
    assert len(q['pending'])==1


def test_seo_hq_rejects_empty_queue(tmp_path: Path, monkeypatch) -> None:
    monkeypatch.chdir(tmp_path)
    _write(tmp_path/'factory/output/writer/seo_queue.json', {'pending':[]})
    try: run_seo_queue(tmp_path)
    except ValueError as exc: assert 'SEO 처리할 글이 없습니다' in str(exc)
    else: raise AssertionError('ValueError expected')
