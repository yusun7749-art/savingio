from __future__ import annotations
from pathlib import Path
from .pipeline import execute
from .utils import save_json, now_iso


def load_topics(path:Path)->list[str]:
    if not path.exists(): raise FileNotFoundError(path)
    topics=[]
    for line in path.read_text(encoding='utf-8-sig').splitlines():
        value=line.strip()
        if value and not value.startswith('#'): topics.append(value)
    return list(dict.fromkeys(topics))


def execute_batch(topics:list[str], project_root:Path, publish:bool=False, overwrite:bool=False)->dict:
    results=[]
    for topic in topics:
        try:
            result=execute(topic,project_root,publish=publish,overwrite=overwrite)
            results.append({'topic':topic,'pass':result['qa']['pass'],'qa_score':result['qa']['score'],'article_path':result['cms']['article_path']})
        except Exception as exc:
            results.append({'topic':topic,'pass':False,'error':str(exc)})
    report={'created_at':now_iso(),'total':len(results),'passed':sum(1 for x in results if x.get('pass')),'failed':sum(1 for x in results if not x.get('pass')),'results':results}
    save_json(project_root/'factory/output/batch_report.json',report)
    return report
