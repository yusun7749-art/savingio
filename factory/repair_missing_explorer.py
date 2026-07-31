from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ARTICLES = ROOT / "articles"

CSS_TOKEN = "/css/savingio-brain-navigation.css"
DATA_TOKEN = "/data/savingio-brain-data.js"
JS_TOKEN = "/js/savingio-brain-navigation.js"

CSS_TAG = '<link rel="stylesheet" href="/css/savingio-brain-navigation.css?v=20260801-full-repair">'
DATA_TAG = '<script src="/data/savingio-brain-data.js?v=20260801-full-repair"></script>'
JS_TAG = '<script src="/js/savingio-brain-navigation.js?v=20260801-full-repair"></script>'

changed = []
details = []

for path in sorted(ARTICLES.glob("*.html")):
    if path.name == "index.html":
        continue

    text = path.read_text(encoding="utf-8", errors="ignore")
    original = text
    added = []

    if CSS_TOKEN not in text and "</head>" in text.lower():
        idx = text.lower().rfind("</head>")
        text = text[:idx] + CSS_TAG + text[idx:]
        added.append("css")

    body_idx = text.lower().rfind("</body>")
    if body_idx >= 0:
        tags = []
        if DATA_TOKEN not in text:
            tags.append(DATA_TAG)
            added.append("data")
        if JS_TOKEN not in text:
            tags.append(JS_TAG)
            added.append("js")
        if tags:
            text = text[:body_idx] + "".join(tags) + text[body_idx:]

    if text != original:
        path.write_text(text, encoding="utf-8")
        rel = path.relative_to(ROOT).as_posix()
        changed.append(rel)
        details.append(f"{rel}\t{','.join(added)}")

report = ROOT / "factory" / "QA" / "MISSING_EXPLORER_REPAIR.txt"
report.parent.mkdir(parents=True, exist_ok=True)
report.write_text(
    f"repaired={len(changed)}\n" + "\n".join(details) + ("\n" if details else ""),
    encoding="utf-8",
)
print(f"repaired={len(changed)}")
