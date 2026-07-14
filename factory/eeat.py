from __future__ import annotations
from pathlib import Path
import re
from .utils import text_only, save_json, now_iso

TRUST_TOKENS = ['출처','근거','공식','업데이트','문의','면책','편집 정책']


def audit_eeat(project_root: Path, minimum_score: int=70) -> dict:
    rows=[]
    for path in sorted((project_root/'articles').glob('*.html')):
        if path.name=='index.html': continue
        raw=path.read_text(encoding='utf-8',errors='ignore')
        text=text_only(raw)
        checks={
            'clear_title': bool(re.search(r'<h1\b[^>]*>.+?</h1>',raw,re.I|re.S)),
            'updated_date': any(x in text for x in ['업데이트','최종 수정','최종 업데이트']),
            'source_signal': any(x in text for x in ['출처','공식 근거','정부 근거']),
            'contact_path': '/contact.html' in raw or 'contact.html' in raw,
            'editorial_path': 'editorial-policy.html' in raw,
            'about_path': '/about.html' in raw or 'about.html' in raw,
            'disclaimer_path': 'disclaimer.html' in raw,
            'practical_content': any(x in text for x in ['체크리스트','해결 순서','자주 묻는 질문','FAQ']),
        }
        score=round(sum(checks.values())/len(checks)*100)
        rows.append({
            'path':path.relative_to(project_root).as_posix(),
            'score':score,'pass':score>=minimum_score,
            'checks':checks,'issues':[k for k,v in checks.items() if not v]
        })
    avg=round(sum(x['score'] for x in rows)/len(rows)) if rows else 0
    report={'generated_at':now_iso(),'article_count':len(rows),'average_score':avg,
            'pass':avg>=minimum_score,'minimum_score':minimum_score,'articles':rows}
    save_json(project_root/'factory'/'output'/'eeat_audit.json',report)
    return report
