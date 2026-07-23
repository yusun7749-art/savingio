#!/usr/bin/env python3
"""Apply Savingio shared platform framework hooks to static pages.

Idempotent rules:
- Article pages receive shared navigation and article framework loaders.
- Calculator pages receive shared navigation plus registry/data/calculator scripts.
- Lab pages receive shared navigation plus registry/data/lab scripts.
- Existing content and approved layout are preserved.
"""

from __future__ import annotations

from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[2]
NAV_STYLE = '<link rel="stylesheet" href="/css/savingio-platform-navigation.css?v=1">'
NAV_SCRIPT = '<script src="/js/savingio-platform-navigation.js?v=1"></script>'
ARTICLE_LOADER = (
    NAV_SCRIPT
    + '<script src="/js/savingio-article-framework.js?v=1"></script>'
)
CALCULATOR_SCRIPTS = (
    NAV_SCRIPT
    + '<script src="/js/savingio-platform-registry.js?v=1"></script>'
    + '<script src="/js/savingio-platform-data.js?v=1"></script>'
    + '<script src="/js/savingio-calculator-framework.js?v=1"></script>'
)
LAB_SCRIPTS = (
    NAV_SCRIPT
    + '<script src="/js/savingio-platform-registry.js?v=1"></script>'
    + '<script src="/js/savingio-platform-data.js?v=1"></script>'
    + '<script src="/js/savingio-lab-framework.js?v=1"></script>'
)


def inject_before_head(html: str, block: str) -> tuple[str, bool]:
    if block in html:
        return html, False
    closing = re.search(r'</head\s*>', html, flags=re.IGNORECASE)
    if not closing:
        raise ValueError('missing </head>')
    return html[:closing.start()] + '\n' + block + '\n' + html[closing.start():], True


def inject_before_body(html: str, block: str) -> tuple[str, bool]:
    markers = re.findall(r'<script\b[^>]*src=["\'][^"\']+["\'][^>]*></script>', block)
    missing = [marker for marker in markers if marker not in html]
    if not missing:
        return html, False
    closing = re.search(r'</body\s*>', html, flags=re.IGNORECASE)
    if not closing:
        raise ValueError('missing </body>')
    insertion = '\n' + ''.join(missing) + '\n'
    return html[:closing.start()] + insertion + html[closing.start():], True


def process(path: Path, block: str) -> tuple[bool, str]:
    try:
        original = path.read_text(encoding='utf-8')
        updated, style_changed = inject_before_head(original, NAV_STYLE)
        updated, script_changed = inject_before_body(updated, block)
        changed = style_changed or script_changed
        if changed:
            path.write_text(updated, encoding='utf-8', newline='\n')
        return changed, 'OK'
    except Exception as exc:  # noqa: BLE001
        return False, f'ERROR: {exc}'


def main() -> int:
    changed_files: list[str] = []
    errors: list[str] = []

    targets = [
        (ROOT / 'articles', ARTICLE_LOADER),
        (ROOT / 'calculators', CALCULATOR_SCRIPTS),
        (ROOT / 'lab', LAB_SCRIPTS),
    ]

    for directory, block in targets:
        if not directory.exists():
            continue
        for path in sorted(directory.glob('*.html')):
            if path.name == 'index.html' and directory.name == 'articles':
                continue
            changed, status = process(path, block)
            relative = path.relative_to(ROOT).as_posix()
            if status != 'OK':
                errors.append(f'{relative}: {status}')
            elif changed:
                changed_files.append(relative)

    print(f'CHANGED {len(changed_files)}')
    for item in changed_files:
        print(f'  + {item}')
    if errors:
        print(f'ERRORS {len(errors)}', file=sys.stderr)
        for item in errors:
            print(f'  ! {item}', file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    raise SystemExit(main())