from __future__ import annotations
from pathlib import Path
import json
from .utils import save_json, now_iso

def build_calculator_analytics(project_root: Path) -> dict:
    links_path=project_root/"factory"/"output"/"calculator"/"article_calculator_links.json"
    links=json.loads(links_path.read_text(encoding="utf-8")) if links_path.exists() else []
    events_path=project_root/"factory"/"input"/"calculator_events.json"
    events=json.loads(events_path.read_text(encoding="utf-8")) if events_path.exists() else []
    counts={}
    for event in events:
        cid=event.get("calculator_id","unknown")
        counts.setdefault(cid,{"views":0,"starts":0,"completions":0,"article_clicks":0})
        kind=event.get("event")
        if kind=="view": counts[cid]["views"]+=1
        elif kind=="start": counts[cid]["starts"]+=1
        elif kind=="complete": counts[cid]["completions"]+=1
        elif kind=="article_click": counts[cid]["article_clicks"]+=1
    rows=[]
    for cid,metrics in counts.items():
        metrics["completion_rate"]=round(metrics["completions"]/metrics["starts"],4) if metrics["starts"] else 0
        rows.append({"calculator_id":cid,**metrics})
    result={
        "linked_article_count":len(links),
        "event_count":len(events),
        "calculators":sorted(rows,key=lambda x:(-x["completions"],x["calculator_id"])),
        "created_at":now_iso(),
    }
    save_json(project_root/"factory"/"output"/"calculator"/"analytics.json",result)
    return result
