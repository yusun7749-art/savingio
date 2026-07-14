from pathlib import Path
import re
from .utils import text_only, now_iso

def audit_file(path:Path)->dict:
    html=path.read_text(encoding='utf-8',errors='ignore'); low=html.lower(); text=text_only(html)
    checks={
      'title':bool(re.search(r'<title>.+?</title>',html,re.I|re.S)), 'description':'name="description"' in low,
      'canonical':'rel="canonical"' in low, 'h1_once':len(re.findall(r'<h1\b',html,re.I))==1,
      'faq':bool(re.search(r'id=["\']faq["\']',html,re.I)) or 'faq' in low, 'table':'<table' in low,
      'internal_links':bool(re.search(r'href=["\']/(?!/)',html)), 'min_chars':len(text)>=1200,
      'schema':'application/ld+json' in low, 'robots':'name="robots"' in low, 'toc':'article-toc' in low or '목차' in text[:800],
      'updated':'업데이트' in text or '최종 업데이트' in text, 'noindex':'noindex' in low}
    weights={'title':10,'description':10,'canonical':10,'h1_once':10,'faq':10,'table':8,'internal_links':10,'min_chars':12,'schema':7,'robots':5,'toc':4,'updated':4}
    score=sum(weights[k] for k,v in checks.items() if k in weights and v)
    if checks['noindex']: score=max(0,score-30)
    missing=[k for k,v in checks.items() if k!='noindex' and not v]
    risk='high' if score<60 or checks['noindex'] else 'medium' if score<80 else 'low'
    return {'file':path.name,'path':path.as_posix(),'score':min(100,score),'checks':checks,'missing':missing,'risk':risk,'text_chars':len(text),'status':'PASS' if score>=80 else 'FAIL'}

def audit_site(project_root:Path,limit:int|None=None)->dict:
    files=sorted((project_root/'articles').glob('*.html'))
    if limit: files=files[:limit]
    rows=[audit_file(p) for p in files]
    avg=round(sum(r['score'] for r in rows)/max(1,len(rows)),2)
    return {'generated_at':now_iso(),'total':len(rows),'pass':sum(r['status']=='PASS' for r in rows),'fail':sum(r['status']=='FAIL' for r in rows),'average':avg,
      'high_risk':sum(r['risk']=='high' for r in rows),'results':rows}
