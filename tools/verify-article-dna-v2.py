from __future__ import annotations
from pathlib import Path
import json
import subprocess
import sys
import zipfile

ROOT = Path(__file__).resolve().parents[1]


def main():
    proc = subprocess.run([sys.executable, str(ROOT/'tools/build-articles-v2.py'), '--verify-only'], cwd=ROOT)
    if proc.returncode != 0:
        return proc.returncode
    qa = json.loads((ROOT/'ARTICLE-ENGINE-V2-QA.json').read_text(encoding='utf-8'))
    manifest = json.loads((ROOT/'ARTICLE-ENGINE-V2-BUILD-MANIFEST.json').read_text(encoding='utf-8'))
    required = [
        ROOT/'templates/article-v2.html', ROOT/'data/article-configs-v2.json',
        ROOT/'data/article-type-rules.json', ROOT/'data/site-navigation.json',
        ROOT/'tests/article-type-fixtures.json', ROOT/'tools/build-articles-v2.py'
    ]
    missing = [str(p.relative_to(ROOT)) for p in required if not p.exists()]
    if missing:
        print(json.dumps({'status':'FAIL','missing':missing}, ensure_ascii=False, indent=2))
        return 1
    print(json.dumps({
        'status':'PASS','engine_version':manifest['engine_version'],
        'sample_articles':len(qa['articles']),'type_fixtures':len(qa['type_fixtures']),
        'navigation_errors':qa['navigation_errors']
    }, ensure_ascii=False, indent=2))
    return 0


if __name__ == '__main__':
    sys.exit(main())
