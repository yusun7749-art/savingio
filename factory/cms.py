from pathlib import Path
from .utils import save_json, atomic_write, now_iso, relative_posix
from .search_index_builder import build as rebuild_search_index

def save_article(project_root:Path,seo:dict,html:str,qa:dict,research:dict,publish:bool=False,overwrite:bool=False)->dict:
    if publish and (not qa['pass'] or not research['ready_for_publish']):
        raise RuntimeError('발행 차단: QA 95점 및 공식 근거 점수를 모두 충족해야 합니다.')
    folder=project_root/'articles' if publish else project_root/'factory'/'output'/'drafts'
    target=folder/f"{seo['slug']}.html"; target.parent.mkdir(parents=True,exist_ok=True)
    if target.exists() and not overwrite: target=target.with_name(target.stem+'-factory'+target.suffix)
    atomic_write(target,html)
    manifest={'article_path':relative_posix(target,project_root),'canonical':seo['canonical'],
      'qa_score':qa['score'],'evidence_score':research['evidence_score'],'published':publish,'saved_at':now_iso()}
    if publish and (project_root/'data'/'savingio-brain-data.json').is_file() and (project_root/'articles'/'index.html').is_file():
        search = rebuild_search_index(project_root)
        manifest['search_index'] = {'status':'rebuilt','count':search['count'],'version':search['version']}
    save_json(project_root/'factory'/'output'/'cms_manifest.json',manifest); return manifest
