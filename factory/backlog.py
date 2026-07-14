from collections import Counter
from .utils import now_iso

def build_backlog(audit:dict)->dict:
    candidates=[r for r in audit['results'] if r['status']=='FAIL' or r.get('risk')!='low']
    counts=Counter(k for r in candidates for k in r.get('missing',[]))
    def priority_score(r):
        bonus=30 if r.get('risk')=='high' else 10 if r.get('risk')=='medium' else 0
        return (100-r['score'])+bonus+min(20,len(r.get('missing',[]))*2)
    priority=sorted(candidates,key=lambda r:(-priority_score(r),r['text_chars'],r['file']))
    rows=[]
    for i,r in enumerate(priority):
        rows.append({'rank':i+1,'file':r['file'],'score':r['score'],'risk':r.get('risk'),'priority_score':priority_score(r),'missing':r.get('missing',[]),'recommended_action':'full_renewal' if r.get('risk')=='high' else 'targeted_repair'})
    return {'generated_at':now_iso(),'summary':{'total_candidates':len(rows),'failure_counts':dict(counts),'high_priority':sum(x['recommended_action']=='full_renewal' for x in rows)},'priority':rows}
