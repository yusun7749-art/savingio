from __future__ import annotations
from pathlib import Path
import json, re, shutil
from .utils import save_json, now_iso

def _resolve_page(root: Path, page: str):
    if page.startswith(('http://','https://')): page='/'+page.split('/',3)[-1]
    rel=page.lstrip('/'); candidates=[root/rel]
    if not rel.endswith('.html'): candidates += [root/(rel+'.html'),root/rel/'index.html']
    return next((p for p in candidates if p.exists() and p.is_file()),None)

def apply_action(root: Path, action: dict, execute: bool=False) -> dict:
    target=_resolve_page(root,action['page'])
    if not target: return {'status':'blocked','reason':'page_not_found','page':action['page']}
    if not execute: return {'status':'dry_run','target':target.relative_to(root).as_posix(),'action':action}
    original=target.read_text(encoding='utf-8'); updated=original; kind=action.get('action')
    if kind=='rewrite_title_meta':
        updated=re.sub(r'(<meta\s+name=["\']description["\']\s+content=["\'])(.*?)(["\'])',lambda m:m.group(1)+(m.group(2).rstrip(' .')+' | 조건과 확인 순서를 한눈에 정리했습니다.')[:155]+m.group(3),updated,count=1,flags=re.I|re.S)
    elif kind=='improve_indexability_internal_links':
        marker='<!-- factory-auto-internal-links -->'
        if marker not in updated:
            block=marker+'<section class="factory-related-links"><h2>함께 확인할 내용</h2><p><a href="/articles/">Savingio 생활정보 전체 보기</a></p></section>'
            updated=updated.replace('</main>',block+'</main>',1)
    else: return {'status':'skipped','reason':'unsupported_action','action':kind}
    if updated==original: return {'status':'skipped','reason':'no_change','target':target.relative_to(root).as_posix()}
    backup=root/'factory'/'backups'/'analytics-rework'/target.relative_to(root); backup.parent.mkdir(parents=True,exist_ok=True); shutil.copy2(target,backup); target.write_text(updated,encoding='utf-8')
    return {'status':'completed','target':target.relative_to(root).as_posix(),'backup':backup.relative_to(root).as_posix(),'action':kind,'created_at':now_iso()}

def execute_actions(root: Path, actions_path: Path|None=None, execute: bool=False, limit: int=20) -> dict:
    path=actions_path or root/'factory'/'output'/'analytics'/'optimization_actions.json'; payload=json.loads(path.read_text(encoding='utf-8'))
    results=[apply_action(root,a,execute=execute) for a in payload.get('actions',[])[:limit]]
    report={'execute':execute,'result_count':len(results),'completed':sum(x['status']=='completed' for x in results),'dry_run':sum(x['status']=='dry_run' for x in results),'blocked':sum(x['status']=='blocked' for x in results),'results':results,'created_at':now_iso()}
    save_json(root/'factory'/'output'/'analytics'/'optimization_execution.json',report); return report
