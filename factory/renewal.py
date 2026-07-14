from pathlib import Path
import shutil, re
from .auditor import audit_file
from .pipeline import execute
from .utils import now_iso, save_json, relative_posix


def _topic_from_html(path:Path)->str:
    raw=path.read_text(encoding='utf-8',errors='ignore')
    m=re.search(r'<h1[^>]*>(.*?)</h1>',raw,re.I|re.S) or re.search(r'<title>(.*?)</title>',raw,re.I|re.S)
    return re.sub(r'<[^>]+>','',m.group(1)).strip() if m else path.stem.replace('-',' ')

def backup_article(project_root:Path,path:Path)->str:
    stamp=now_iso().replace(':','-')
    target=project_root/'factory/backups'/stamp/path.name
    target.parent.mkdir(parents=True,exist_ok=True); shutil.copy2(path,target)
    return relative_posix(target,project_root)

def renew_article(project_root:Path,article_path:Path,evidence_file:Path|None=None,apply:bool=False)->dict:
    article_path=article_path.resolve()
    before=audit_file(article_path); topic=_topic_from_html(article_path)
    backup=backup_article(project_root,article_path)
    result=execute(topic,project_root,publish=False,overwrite=True,evidence_file=evidence_file)
    draft=project_root/result['cms']['article_path']
    target=article_path
    applied=False
    if apply:
        if not result['qa']['pass']:
            raise RuntimeError('QA 미통과로 기존 글 교체를 차단했습니다.')
        shutil.copy2(draft,target); applied=True
    after=audit_file(target if applied else draft)
    report={'topic':topic,'source':relative_posix(article_path,project_root),'backup':backup,'draft':relative_posix(draft,project_root),'applied':applied,'before':before,'after':after,'qa':result['qa'],'created_at':now_iso()}
    save_json(project_root/'factory/output/renewal_report.json',report); return report

def rollback(project_root:Path,backup_path:Path,target_path:Path)->dict:
    source=(project_root/backup_path).resolve(); target=(project_root/target_path).resolve()
    if not source.exists(): raise FileNotFoundError(source)
    target.parent.mkdir(parents=True,exist_ok=True); shutil.copy2(source,target)
    result={'restored_from':relative_posix(source,project_root),'target':relative_posix(target,project_root),'restored_at':now_iso()}
    save_json(project_root/'factory/output/rollback_report.json',result); return result
