from pathlib import Path
import hashlib, json
from .utils import save_json, now_iso

LOCKED_DEFAULT=['index.html','css','js']

def _hash_file(path:Path)->str:
    h=hashlib.sha256(); h.update(path.read_bytes()); return h.hexdigest()

def snapshot(project_root:Path, locked:list[str]|None=None)->dict:
    locked=locked or LOCKED_DEFAULT; rows=[]
    for rel in locked:
        p=project_root/rel
        if p.is_file(): rows.append({'path':rel,'type':'file','hash':_hash_file(p)})
        elif p.is_dir():
            for child in sorted(x for x in p.rglob('*') if x.is_file()):
                rows.append({'path':child.relative_to(project_root).as_posix(),'type':'file','hash':_hash_file(child)})
    result={'created_at':now_iso(),'files':rows}
    save_json(project_root/'factory/output/ui_lock_snapshot.json',result); return result

def verify(project_root:Path,snapshot_data:dict)->dict:
    changed=[]; missing=[]
    for row in snapshot_data.get('files',[]):
        p=project_root/row['path']
        if not p.exists(): missing.append(row['path'])
        elif _hash_file(p)!=row['hash']: changed.append(row['path'])
    return {'pass':not changed and not missing,'changed':changed,'missing':missing,'checked_at':now_iso()}
