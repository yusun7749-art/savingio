from pathlib import Path
import hashlib,json
from .utils import save_json,now_iso
LOCKED=["index.html","about.html","contact.html","privacy.html","css","js","articles/index.html"]
def h(p):
    d=hashlib.sha256()
    with p.open("rb") as f:
        for c in iter(lambda:f.read(1048576),b""): d.update(c)
    return d.hexdigest()
def build_regression_manifest(root:Path):
    e=[]
    for rel in LOCKED:
        p=root/rel
        if p.is_file(): e.append({"path":rel,"type":"file","sha256":h(p),"bytes":p.stat().st_size})
        elif p.is_dir():
            for c in sorted(x for x in p.rglob("*") if x.is_file()): e.append({"path":c.relative_to(root).as_posix(),"type":"file","sha256":h(c),"bytes":c.stat().st_size})
        else: e.append({"path":rel,"type":"missing","sha256":"","bytes":0})
    r={"entry_count":len(e),"missing_count":sum(x["type"]=="missing" for x in e),"entries":e,"created_at":now_iso()}
    save_json(root/"factory"/"output"/"regression_manifest.json",r); return r
def compare_regression_manifest(root:Path,baseline_path:Path):
    b=json.loads(baseline_path.read_text(encoding="utf-8")); c=build_regression_manifest(root)
    bm={x["path"]:x for x in b["entries"]}; cm={x["path"]:x for x in c["entries"]}
    ch=[{"path":p,"before":bm.get(p),"after":cm.get(p)} for p in sorted(set(bm)|set(cm)) if bm.get(p)!=cm.get(p)]
    return {"pass":not ch,"changed_count":len(ch),"changed":ch,"checked_at":now_iso()}
