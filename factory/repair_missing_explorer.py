from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ARTICLES = ROOT / "articles"
MARKER = "savingio-brain-navigation.js"
INJECT = ('<script src="/data/savingio-brain-data.js?v=20260801-explorer-fix"></script>'
          '<script src="/js/savingio-brain-navigation.js?v=20260801-explorer-fix"></script>')

changed = []
for path in sorted(ARTICLES.glob("*.html")):
    if path.name == "index.html":
        continue
    text = path.read_text(encoding="utf-8", errors="ignore")
    if MARKER in text:
        continue
    if "</body>" not in text.lower():
        continue
    idx = text.lower().rfind("</body>")
    text = text[:idx] + INJECT + text[idx:]
    path.write_text(text, encoding="utf-8")
    changed.append(path.relative_to(ROOT).as_posix())

report = ROOT / "factory" / "QA" / "MISSING_EXPLORER_REPAIR.txt"
report.parent.mkdir(parents=True, exist_ok=True)
report.write_text("\n".join(changed) + ("\n" if changed else ""), encoding="utf-8")
print(f"repaired={len(changed)}")
