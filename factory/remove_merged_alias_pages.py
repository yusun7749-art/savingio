from __future__ import annotations

import json
import re
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
ARTICLES = ROOT / "articles"
REDIRECTS = ROOT / "_redirects"
REPORT_DIR = ROOT / "factory" / "QA"

CLIENT_REDIRECT_PATTERNS = [
    re.compile(r'<meta[^>]+http-equiv=["\']?refresh["\']?[^>]*>', re.I),
    re.compile(r'location\.(?:href|replace|assign)\s*\(', re.I),
    re.compile(r'window\.location\s*=', re.I),
]

# These signatures identify the unfinished blue/common-template pages shown on the
# live site. They are removed from production inventory instead of remaining as
# thin AdSense-visible pages. A representative article is never removed merely
# for using an ordinary blue link.
LEGACY_TEMPLATE_SIGNATURES = [
    re.compile(r"단순한\s*요약보다\s*본인에게\s*적용되는\s*조건", re.I),
    re.compile(r"필요한\s*행동까지\s*바로\s*이어갈\s*수\s*있도록\s*구성", re.I),
    re.compile(r"세이빙이오\(Savingio\)", re.I),
]
LEGACY_BLUE_SIGNATURES = [
    re.compile(r"#1769ff|#1457c9|#0d6efd|#2563eb", re.I),
    re.compile(r"background\s*:\s*#(?:1769ff|1457c9|0d6efd|2563eb)", re.I),
]


def canonical(text: str) -> str:
    for pattern in (
        r'<link[^>]+rel=["\']canonical["\'][^>]+href=["\']([^"\']+)',
        r'<link[^>]+href=["\']([^"\']+)["\'][^>]+rel=["\']canonical["\']',
    ):
        m = re.search(pattern, text, re.I)
        if m:
            return m.group(1).strip()
    return ""


def visible_text(text: str) -> str:
    text = re.sub(r'<script\b[^>]*>.*?</script>', ' ', text, flags=re.I | re.S)
    text = re.sub(r'<style\b[^>]*>.*?</style>', ' ', text, flags=re.I | re.S)
    text = re.sub(r'<[^>]+>', ' ', text)
    return re.sub(r'\s+', ' ', text).strip()


def redirected_article_sources() -> dict[str, str]:
    mapping: dict[str, str] = {}
    if not REDIRECTS.exists():
        return mapping
    for raw in REDIRECTS.read_text(encoding="utf-8", errors="ignore").splitlines():
        line = raw.strip()
        if not line or line.startswith('#'):
            continue
        parts = line.split()
        if len(parts) < 2:
            continue
        source, target = parts[0], parts[1]
        if not source.startswith('/articles/') or not source.endswith('.html'):
            continue
        if not target.startswith('/articles/'):
            continue
        if source.rstrip('/') == target.rstrip('/'):
            continue
        mapping[source] = target
    return mapping


def classify(path: Path, text: str, redirect_map: dict[str, str]) -> tuple[str | None, str]:
    source = f"/articles/{path.name}"
    if source in redirect_map:
        return "merged-redirect-source", redirect_map[source]

    can = canonical(text)
    if can:
        can_path = urlparse(can).path.rstrip('/')
        own = {f"/articles/{path.name}", f"/articles/{path.stem}"}
        if can_path and can_path not in own:
            return "canonical-to-representative", can_path

    text_only = visible_text(text)
    if any(p.search(text) for p in CLIENT_REDIRECT_PATTERNS) and len(text_only) < 1200:
        return "client-redirect-stub", can or ""

    generic_hits = sum(bool(p.search(text_only)) for p in LEGACY_TEMPLATE_SIGNATURES)
    blue_hits = sum(bool(p.search(text)) for p in LEGACY_BLUE_SIGNATURES)
    # Require both generic copy and a blue legacy signature to avoid deleting a
    # normal article that merely contains a standard blue hyperlink.
    if generic_hits >= 2 and blue_hits >= 1 and len(text_only) < 6500:
        return "unfinished-blue-template", can or ""

    return None, ""


def article_needles(rel_paths: list[str]) -> set[str]:
    out: set[str] = set()
    for rel in rel_paths:
        stem = Path(rel).stem
        out.update({
            f"/articles/{stem}.html",
            f"/articles/{stem}",
            f"https://savingio.com/articles/{stem}.html",
            f"https://savingio.com/articles/{stem}",
        })
    return out


def remove_stale_references(removed_paths: list[str]) -> list[str]:
    needles = article_needles(removed_paths)
    changed: list[str] = []
    roots = [ROOT / "data", ROOT / "js", ROOT / "categories", ROOT / "articles", ROOT / "factory"]
    root_files = [ROOT / "index.html", ROOT / "search.html", ROOT / "sitemap.xml"]
    allowed = {".js", ".json", ".html", ".md", ".txt", ".xml"}
    candidates: list[Path] = []
    for base in roots:
        if base.exists():
            candidates.extend(p for p in base.rglob('*') if p.is_file() and p.suffix.lower() in allowed)
    candidates.extend(p for p in root_files if p.exists())

    for path in sorted(set(candidates)):
        if path == Path(__file__).resolve() or path.name in {"MERGED_ALIAS_REMOVAL.json", "MERGED_ALIAS_REMOVAL.md"}:
            continue
        original = path.read_text(encoding="utf-8", errors="ignore")
        text = original

        if path.suffix.lower() in {".js", ".json", ".md", ".txt", ".xml"}:
            lines = text.splitlines()
            text = "\n".join(line for line in lines if not any(n in line for n in needles))
            if original.endswith("\n"):
                text += "\n"
        else:
            # Remove navigation/list anchors pointing to retired pages. Article
            # prose is not rewritten here; only exact linked elements are removed.
            for needle in sorted(needles, key=len, reverse=True):
                text = re.sub(
                    rf'<a\b[^>]*href=["\']{re.escape(needle)}["\'][^>]*>.*?</a>',
                    '', text, flags=re.I | re.S,
                )
            # Remove simple list/card wrappers left empty after anchor removal.
            text = re.sub(r'<li\b[^>]*>\s*</li>', '', text, flags=re.I | re.S)

        if text != original:
            path.write_text(text, encoding="utf-8")
            changed.append(path.relative_to(ROOT).as_posix())
    return sorted(set(changed))


def find_broken_article_references() -> dict[str, list[str]]:
    existing = {f"/articles/{p.name}" for p in ARTICLES.glob('*.html')}
    existing |= {x[:-5] for x in existing if x.endswith('.html')}
    broken: dict[str, list[str]] = {}
    scan_roots = [ROOT / "data", ROOT / "js", ROOT / "categories", ROOT / "articles"]
    pattern = re.compile(r'(?:https://savingio\.com)?(/articles/[A-Za-z0-9가-힣_#%.-]+(?:\.html)?)')
    for base in scan_roots:
        if not base.exists():
            continue
        for path in base.rglob('*'):
            if not path.is_file() or path.suffix.lower() not in {'.html', '.js', '.json'}:
                continue
            text = path.read_text(encoding='utf-8', errors='ignore')
            misses = sorted({m.group(1).rstrip('/') for m in pattern.finditer(text) if m.group(1).rstrip('/') not in existing})
            if misses:
                broken[path.relative_to(ROOT).as_posix()] = misses
    return broken


def main() -> None:
    redirect_map = redirected_article_sources()
    removed: list[dict] = []

    for path in sorted(ARTICLES.glob('*.html')):
        if path.name == 'index.html':
            continue
        text = path.read_text(encoding='utf-8', errors='ignore')
        reason, representative = classify(path, text, redirect_map)
        if not reason:
            continue
        removed.append({
            'path': path.relative_to(ROOT).as_posix(),
            'reason': reason,
            'representative': representative,
            'canonical': canonical(text),
            'bytes': path.stat().st_size,
        })
        path.unlink()

    removed_paths = [item['path'] for item in removed]
    changed_refs = remove_stale_references(removed_paths) if removed_paths else []
    broken_after = find_broken_article_references()

    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    payload = {
        'task': 'remove-merged-broken-legacy-pages',
        'deleted_count': len(removed),
        'deleted': removed,
        'reference_files_updated': changed_refs,
        'broken_article_references_after_cleanup': broken_after,
        'rules': [
            'delete source HTML already mapped to another representative article in _redirects',
            'delete canonical/client redirect stubs',
            'delete unfinished blue common-template pages only when both generic copy and legacy-blue signatures match',
            'remove retired titles and URLs from Explorer/search/category/sitemap references',
        ],
    }
    (REPORT_DIR / 'MERGED_ALIAS_REMOVAL.json').write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + '\n', encoding='utf-8'
    )
    lines = [
        '# 통합·404·미변경 페이지 정리 결과', '',
        f"- 삭제 파일: **{len(removed)}개**",
        f"- 검색트리·목록 참조 수정: **{len(changed_refs)}개 파일**",
        f"- 정리 후 남은 잘못된 article 참조 파일: **{len(broken_after)}개**", '',
        '| 삭제 파일 | 판정 | 대표 URL |', '|---|---|---|',
    ]
    for item in removed:
        lines.append(f"| `{item['path']}` | {item['reason']} | `{item['representative']}` |")
    lines += ['', '## 수정된 검색·Navigation 파일', ''] + [f'- `{p}`' for p in changed_refs]
    if broken_after:
        lines += ['', '## 추가 확인이 필요한 잔여 404 참조', '']
        for path, refs in broken_after.items():
            lines.append(f"- `{path}`: {', '.join(f'`{r}`' for r in refs)}")
    (REPORT_DIR / 'MERGED_ALIAS_REMOVAL.md').write_text('\n'.join(lines) + '\n', encoding='utf-8')
    print(json.dumps({'deleted': len(removed), 'updated_refs': len(changed_refs), 'broken_files': len(broken_after)}, ensure_ascii=False))


if __name__ == '__main__':
    main()
