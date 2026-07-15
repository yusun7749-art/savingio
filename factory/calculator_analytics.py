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
        counts.setdefault(cid,{"views":0,"starts":0,"completions":0,"article_clicks":0,"action_clicks":0,"related_clicks":0,"action_levels":{}})
        kind=event.get("event")
        aliases={"calculator_view":"view","calculator_start":"start","calculator_complete":"complete","calculator_action_click":"action_click","calculator_related_click":"related_click"}
        kind=aliases.get(kind,kind)
        if kind=="view": counts[cid]["views"]+=1
        elif kind=="start": counts[cid]["starts"]+=1
        elif kind=="complete": counts[cid]["completions"]+=1
        elif kind=="article_click": counts[cid]["article_clicks"]+=1
        elif kind=="action_click": counts[cid]["action_clicks"]+=1
        elif kind=="related_click": counts[cid]["related_clicks"]+=1
        level=event.get("action_level")
        if level: counts[cid]["action_levels"][level]=counts[cid]["action_levels"].get(level,0)+1
    rows=[]
    for cid,metrics in counts.items():
        metrics["completion_rate"]=round(metrics["completions"]/metrics["starts"],4) if metrics["starts"] else 0
        metrics["action_click_rate"]=round(metrics["action_clicks"]/metrics["completions"],4) if metrics["completions"] else 0
        metrics["revenue_flow_score"]=round(metrics["completions"]*1.0+metrics["action_clicks"]*2.5+metrics["related_clicks"]*1.5,2)
        rows.append({"calculator_id":cid,**metrics})
    result={
        "linked_article_count":len(links),
        "event_count":len(events),
        "total_completions":sum(x["completions"] for x in counts.values()),
        "total_action_clicks":sum(x["action_clicks"] for x in counts.values()),
        "revenue_flow_score":round(sum(x["completions"]+x["action_clicks"]*2.5+x["related_clicks"]*1.5 for x in counts.values()),2),
        "calculators":sorted(rows,key=lambda x:(-x["completions"],x["calculator_id"])),
        "created_at":now_iso(),
    }
    save_json(project_root/"factory"/"output"/"calculator"/"analytics.json",result)
    return result
