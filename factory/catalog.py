from pathlib import Path
import re
from .utils import save_json

def scan_articles(project_root: Path) -> list[dict]:
    rows=[]
    for p in sorted((project_root/'articles').glob('*.html')):
        if p.name=='index.html': continue
        raw=p.read_text(encoding='utf-8',errors='ignore')
        title_match=re.search(r'<title>(.*?)</title>',raw,re.I|re.S)
        h1_match=re.search(r'<h1[^>]*>(.*?)</h1>',raw,re.I|re.S)
        title=re.sub(r'<[^>]+>','', (h1_match or title_match).group(1)).strip() if (h1_match or title_match) else p.stem
        rows.append({'slug':p.stem,'title':title,'path':f'articles/{p.name}','url':f'/articles/{p.name}'})
    return rows

def related_links(topic: str, catalog: list[dict], limit: int=5) -> list[dict]:
    tokens=set(re.findall(r'[가-힣A-Za-z0-9]{2,}',topic.lower()))
    scored=[]
    for row in catalog:
        words=set(re.findall(r'[가-힣A-Za-z0-9]{2,}',row['title'].lower()))
        score=len(tokens & words)
        if score: scored.append((score,row))
    scored.sort(key=lambda x:(-x[0],x[1]['title']))
    fallback=[r for r in catalog if r not in [x[1] for x in scored]]
    return [x[1] for x in scored[:limit]] + fallback[:max(0,limit-len(scored))]

def write_catalog(project_root: Path, output_dir: Path) -> list[dict]:
    data=scan_articles(project_root)
    save_json(output_dir/'article_catalog.json',{'count':len(data),'articles':data})
    return data
