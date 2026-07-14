from __future__ import annotations
from pathlib import Path
from urllib.parse import urlparse
from .utils import load_json


def validate_evidence_items(items:list[dict], config_dir:Path)->dict:
    rules=load_json(config_dir/'research_rules.json')
    trusted=rules.get('trusted_domains',[])
    normalized=[]; issues=[]
    for idx,item in enumerate(items):
        url=str(item.get('url','')).strip(); claim=str(item.get('claim','')).strip(); source=str(item.get('source_name','')).strip()
        parsed=urlparse(url)
        valid_url=parsed.scheme in {'http','https'} and bool(parsed.netloc)
        official=any(parsed.netloc==d or parsed.netloc.endswith('.'+d) for d in trusted)
        verified=bool(valid_url and claim and source)
        row={**item,'url':url,'claim':claim,'source_name':source,'valid_url':valid_url,'official_domain':official,'verified':verified}
        normalized.append(row)
        if not verified: issues.append({'index':idx,'issue':'missing_or_invalid_required_field'})
        elif not official: issues.append({'index':idx,'issue':'non_official_domain'})
    verified=sum(1 for x in normalized if x['verified'])
    official=sum(1 for x in normalized if x['verified'] and x['official_domain'])
    score=min(100, verified*15+official*10)
    return {'items':normalized,'verified_count':verified,'official_count':official,'score':score,'issues':issues}
