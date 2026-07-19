from __future__ import annotations

from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
ARTICLES = ROOT / "articles"
STYLE_LINK = '<link rel="stylesheet" href="/css/savingio-article-unified-v3036.css?v=3036">'
QUERY_SCRIPT = '<script src="/js/articles-query-router-v3037.js?v=3037" defer></script>'
WARNING_BLOCK = re.compile(
    r"(?:\ufeff)?\s*Warning:\s*truncated output\s*\(original token count:\s*\d+\)\s*"
    r"Total output lines:\s*\d+\s*",
    re.IGNORECASE,
)


def clean(text: str) -> str:
    old = None
    while old != text:
        old = text
        text = WARNING_BLOCK.sub("", text)
    return text.lstrip()


def apply(path: Path) -> bool:
    original = path.read_text(encoding="utf-8", errors="replace")
    updated = clean(original)

    if STYLE_LINK not in updated and "</head>" in updated:
        updated = updated.replace("</head>", STYLE_LINK + "</head>", 1)

    if path.name == "index.html" and QUERY_SCRIPT not in updated and "</body>" in updated:
        updated = updated.replace("</body>", QUERY_SCRIPT + "</body>", 1)

    if updated == original:
        return False

    path.write_text(updated, encoding="utf-8", newline="\n")
    return True


def main() -> None:
    changed = []
    for path in sorted(ARTICLES.glob("*.html")):
        if apply(path):
            changed.append(path.relative_to(ROOT).as_posix())

    print(f"changed={len(changed)}")
    for item in changed:
        print(item)


if __name__ == "__main__":
    main()
