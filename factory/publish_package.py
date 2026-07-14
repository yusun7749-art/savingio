from __future__ import annotations
from pathlib import Path
import json
from .utils import save_json, now_iso

def build_publish_package(project_root:Path):
    report_path=project_root/'factory'/'output'/'full_automation_report.json'
    if not report_path.exists(): raise FileNotFoundError(report_path)
    report=json.loads(report_path.read_text(encoding='utf-8'))
    html=''
    draft=project_root/'factory'/'output'/'draft.html'
    if draft.exists(): html=draft.read_text(encoding='utf-8')
    if not html:
        article_path=(report.get('cms') or {}).get('article_path')
        if article_path and (project_root/article_path).exists(): html=(project_root/article_path).read_text(encoding='utf-8')
    if not html: raise RuntimeError('publish_html_not_found')
    package={'topic':report['topic'],'title':report['seo']['title'],'slug':report['seo']['slug'],'html':html,'canonical':report['seo'].get('canonical'),'qa_score':report['qa']['score'],'evidence_score':report['research'].get('evidence_score',0),'approval_status':(report.get('approval') or {}).get('status'),'image_manifest':report.get('image') or {},'created_at':now_iso()}
    save_json(project_root/'factory'/'output'/'publish_package.json',package)
    return package
