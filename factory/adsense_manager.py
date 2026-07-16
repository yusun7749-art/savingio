from __future__ import annotations
from pathlib import Path
import json,re,shutil
from .utils import save_json,now_iso

TEXT_SUFFIXES={".html",".htm",".js",".json",".py",".txt",".css",".md",".xml",".yml",".yaml",".env",".toml",".ini",".cfg"}
PUB_PATTERN=re.compile(r"(?<![A-Za-z0-9_-])(?:ca-)?pub-\d{10,}")
ADS_SCRIPT_PATTERN=re.compile(r'<script[^>]+pagead2\.googlesyndication\.com/pagead/js/adsbygoogle\.js[^>]*></script>',re.I|re.S)

def load_identity(project_root:Path)->dict:
    p=project_root/"factory"/"config"/"adsense_identity.json"
    d=json.loads(p.read_text(encoding="utf-8"))
    if d.get("adsense_client")!="ca-"+d.get("publisher_id",""): raise RuntimeError("adsense_identity_client_mismatch")
    return d

def _files(root:Path):
    ignored={".git","__pycache__",".pytest_cache","node_modules"}
    ignored_prefixes={("factory","tests"),("factory","output","adsense"),("factory","backups","adsense-lock")}
    for p in root.rglob("*"):
        if not p.is_file() or any(part in ignored for part in p.parts):
            continue
        try:
            rel_parts=p.relative_to(root).parts
        except ValueError:
            continue
        if any(rel_parts[:len(prefix)]==prefix for prefix in ignored_prefixes):
            continue
        if p.suffix.lower() in TEXT_SUFFIXES or p.name in {"ads.txt",".env"}:
            yield p

def scan_publisher_ids(root:Path)->dict:
    i=load_identity(root); allowed={i["publisher_id"],i["adsense_client"]}; rows=[]; invalid=[]
    for p in _files(root):
        ids=sorted(set(PUB_PATTERN.findall(p.read_text(encoding="utf-8",errors="ignore"))))
        if ids:
            rel=p.relative_to(root).as_posix(); rows.append({"path":rel,"ids":ids})
            wrong=[x for x in ids if x not in allowed]
            if wrong: invalid.append({"path":rel,"invalid_ids":wrong})
    r={"pass":not invalid,"official_publisher_id":i["publisher_id"],"official_client":i["adsense_client"],"files_with_ids":rows,"invalid_count":len(invalid),"invalid":invalid,"checked_at":now_iso()}
    save_json(root/"factory"/"output"/"adsense"/"publisher_scan.json",r); return r

def repair_publisher_ids(root:Path,backup:bool=False)->dict:
    i=load_identity(root); allowed={(root/x).resolve() for x in i.get("allowed_literal_files",[])}; changed=[]
    for p in _files(root):
        if p.resolve() in allowed: continue
        old=p.read_text(encoding="utf-8",errors="ignore")
        new=PUB_PATTERN.sub(lambda m:i["adsense_client"] if m.group(0).startswith("ca-pub-") else i["publisher_id"],old)
        if new!=old:
            b=None
            if backup:
                bp=root/"factory"/"backups"/"adsense-lock"/p.relative_to(root); bp.parent.mkdir(parents=True,exist_ok=True); shutil.copy2(p,bp); b=bp.relative_to(root).as_posix()
            p.write_text(new,encoding="utf-8"); changed.append({"path":p.relative_to(root).as_posix(),"backup":b})
    r={"changed_count":len(changed),"changed":changed,"checked_at":now_iso()}
    save_json(root/"factory"/"output"/"adsense"/"repair_report.json",r); return r

def ensure_ads_txt(root:Path,execute:bool=False)->dict:
    i=load_identity(root); p=root/"ads.txt"; expected=i["ads_txt_line"].strip()+"\n"; current=p.read_text(encoding="utf-8",errors="ignore") if p.exists() else ""
    valid=current.strip()==expected.strip()
    if execute and not valid: p.write_text(expected,encoding="utf-8"); valid=True
    r={"path":"ads.txt","exists":p.exists(),"valid":valid,"executed":execute,"checked_at":now_iso()}
    save_json(root/"factory"/"output"/"adsense"/"ads_txt_report.json",r); return r

def ensure_html_adsense_identity(html:str,identity:dict)->str:
    html=PUB_PATTERN.sub(lambda m:identity["adsense_client"] if m.group(0).startswith("ca-pub-") else identity["publisher_id"],html)
    if not identity.get("inject_in_generated_html",True): return html
    script='<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client='+identity["adsense_client"]+'" crossorigin="anonymous"></script>'
    if ADS_SCRIPT_PATTERN.search(html): html=ADS_SCRIPT_PATTERN.sub(script,html,count=1)
    elif "</head>" in html: html=html.replace("</head>",script+"</head>",1)
    return html

def validate_index_html(root:Path,execute:bool=False)->dict:
    i=load_identity(root); p=root/"index.html"
    if not p.exists(): return {"pass":False,"reason":"index_missing","checked_at":now_iso()}
    old=p.read_text(encoding="utf-8",errors="ignore"); new=ensure_html_adsense_identity(old,i); ids=sorted(set(PUB_PATTERN.findall(new)))
    ok=i["adsense_client"] in ids and all(x in {i["publisher_id"],i["adsense_client"]} for x in ids)
    if execute and new!=old: p.write_text(new,encoding="utf-8")
    r={"pass":ok,"ids":ids,"changed":new!=old,"executed":execute and new!=old,"checked_at":now_iso()}
    save_json(root/"factory"/"output"/"adsense"/"index_report.json",r); return r

def run_adsense_lock(root:Path,execute_repair:bool=False,block_on_error:bool=True)->dict:
    repair=repair_publisher_ids(root) if execute_repair else {"changed_count":0,"changed":[]}
    ads=ensure_ads_txt(root,execute_repair); index=validate_index_html(root,execute_repair); scan=scan_publisher_ids(root)
    blockers=[]
    if not scan["pass"]: blockers.append("invalid_publisher_id")
    if not ads["valid"]: blockers.append("ads_txt_invalid")
    if not index["pass"]: blockers.append("index_adsense_invalid")
    r={"pass":not blockers,"blockers":blockers,"repair":repair,"ads_txt":ads,"index":index,"scan":scan,"status":"blocked" if blockers and block_on_error else ("pass" if not blockers else "warning"),"checked_at":now_iso()}
    save_json(root/"factory"/"output"/"adsense"/"adsense_lock_report.json",r); return r
