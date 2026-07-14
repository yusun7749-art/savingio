from __future__ import annotations
from pathlib import Path
import re
from urllib.parse import urlparse
from .utils import save_json, now_iso


def audit_indexability(project_root: Path) -> dict:
    rows=[]
    canonical_seen={}
    for path in sorted((project_root/'articles').glob('*.html')):
        if path.name=='index.html': continue
        raw=path.read_text(encoding='utf-8',errors='ignore')
        robots=re.search(r'<meta[^>]+name=["\']robots["\'][^>]+content=["\']([^"\']+)',raw,re.I)
        canonical=re.search(r'<link[^>]+rel=["\']canonical["\'][^>]+href=["\']([^"\']+)',raw,re.I)
        value=canonical.group(1).strip() if canonical else ''
        canonical_seen.setdefault(value,[]).append(path.name)
        checks={
            'not_noindex': not (robots and 'noindex' in robots.group(1).lower()),
            'canonical_present': bool(value),
            'canonical_https': value.startswith('https://') if value else False,
            'canonical_savingio': urlparse(value).netloc in ('savingio.com','www.savingio.com') if value else False,
            'canonical_matches_file': value.endswith('/'+path.name) if value else False,
        }
        rows.append({'path':path.relative_to(project_root).as_posix(),'canonical':value,
                     'pass':all(checks.values()),'checks':checks,
                     'issues':[k for k,v in checks.items() if not v]})
    duplicate={k:v for k,v in canonical_seen.items() if k and len(v)>1}
    report={'generated_at':now_iso(),'article_count':len(rows),
            'pass_count':sum(1 for x in rows if x['pass']),
            'duplicate_canonicals':duplicate,'articles':rows,
            'pass':all(x['pass'] for x in rows) and not duplicate}
    save_json(project_root/'factory'/'output'/'indexability_audit.json',report)
    return report
