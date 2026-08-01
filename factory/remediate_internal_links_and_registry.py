from __future__ import annotations

import json
import re
from pathlib import Path
from urllib.parse import quote, urlparse

ROOT = Path(__file__).resolve().parents[1]
HTML_DIRS = [ROOT / 'articles', ROOT / 'topics', ROOT / 'calculators', ROOT / 'categories']
FIXED_HTML = [ROOT / 'index.html', ROOT / 'search.html', ROOT / 'articles' / 'index.html', ROOT / 'calculators' / 'index.html']
DATA_JSON = ROOT / 'data' / 'savingio-brain-data.json'
REPORT = ROOT / 'factory' / 'QA' / 'INTERNAL_LINK_REMEDIATION.json'


def exists(href: str) -> bool:
    path = urlparse(href).path
    if not path.startswith('/'):
        return True
    rel = path.lstrip('/')
    candidates = [ROOT / rel]
    if path.endswith('/'):
        candidates.append(ROOT / rel / 'index.html')
    else:
        candidates.extend([ROOT / f'{rel}.html', ROOT / rel / 'index.html'])
    return any(p.exists() for p in candidates)


def fallback(label: str) -> str:
    label = re.sub(r'<[^>]+>', ' ', label)
    label = re.sub(r'\s+', ' ', label).strip()
    return '/search.html' if not label else '/search.html?q=' + quote(label[:80])


def fix_html(path: Path) -> list[dict]:
    text = path.read_text(encoding='utf-8', errors='ignore')
    changes: list[dict] = []
    pattern = re.compile(r'<a\b([^>]*?)href=["\']([^"\']+)["\']([^>]*)>(.*?)</a>', re.I | re.S)

    def repl(m: re.Match[str]) -> str:
        href = m.group(2)
        if href.startswith(('#', 'mailto:', 'tel:', 'javascript:', 'http://', 'https://')):
            if not href.startswith('https://savingio.com') or exists(href):
                return m.group(0)
        elif not href.startswith('/') or exists(href):
            return m.group(0)
        new_href = fallback(m.group(4))
        changes.append({'old': href, 'new': new_href})
        return f'<a{m.group(1)}href="{new_href}"{m.group(3)}>{m.group(4)}</a>'

    updated = pattern.sub(repl, text)
    if updated != text:
        path.write_text(updated, encoding='utf-8')
    return changes


def prune_tree(node, removed: list[dict]):
    if isinstance(node, list):
        out = []
        for item in node:
            if isinstance(item, dict) and item.get('href') and not exists(str(item['href'])):
                removed.append({'title': item.get('title', ''), 'href': item['href']})
                continue
            out.append(prune_tree(item, removed))
        return out
    if isinstance(node, dict):
        return {k: prune_tree(v, removed) for k, v in node.items()}
    return node


def main() -> None:
    files = []
    for folder in HTML_DIRS:
        if folder.exists():
            files.extend(folder.glob('*.html'))
    files.extend(p for p in FIXED_HTML if p.exists())
    results = []
    for path in sorted(set(files)):
        changes = fix_html(path)
        if changes:
            results.append({'file': path.relative_to(ROOT).as_posix(), 'changes': changes})

    removed = []
    if DATA_JSON.exists():
        data = json.loads(DATA_JSON.read_text(encoding='utf-8'))
        cleaned = prune_tree(data, removed)
        DATA_JSON.write_text(json.dumps(cleaned, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

    REPORT.parent.mkdir(parents=True, exist_ok=True)
    REPORT.write_text(json.dumps({'files_changed': len(results), 'links_fixed': sum(len(x['changes']) for x in results), 'registry_items_removed': len(removed), 'files': results, 'removed_registry_items': removed}, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(REPORT.read_text(encoding='utf-8'))


if __name__ == '__main__':
    main()
