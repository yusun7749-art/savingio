from pathlib import Path
import hashlib
from .release_journal import verify_release_journal
from .utils import save_json,now_iso
def hf(p):
    d=hashlib.sha256()
    with p.open("rb") as f:
        for c in iter(lambda:f.read(1048576),b""): d.update(c)
    return d.hexdigest()
def build_final_release_manifest(root:Path,version:str):
    files=[{"path":p.relative_to(root).as_posix(),"sha256":hf(p),"bytes":p.stat().st_size} for p in sorted(x for x in (root/"factory").rglob("*.py") if x.is_file())]
    j=verify_release_journal(root)
    r={"version":version,"factory_python_file_count":len(files),"factory_python_files":files,"release_journal":j,"ready":j.get("pass") is True,"created_at":now_iso()}
    save_json(root/"factory"/"output"/"final_release_manifest.json",r); return r
