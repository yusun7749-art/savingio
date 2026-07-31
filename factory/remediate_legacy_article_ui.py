from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
QUEUE_PATH = ROOT / "factory" / "QA" / "UI_REMEDIATION_QUEUE.json"
REPORT_PATH = ROOT / "factory" / "QA" / "UI_REMEDIATION_APPLIED.md"

OVERRIDE = r'''
<style id="savingio-legacy-ui-remediation">
:root{--brand:#132744!important;--primary:#132744!important;--accent:#b98238!important;--ink:#292d31!important;--muted:#6c716f!important;--line:rgba(143,119,84,.20)!important;--soft:#fbf7ef!important}
html{scroll-behavior:smooth}
body{background:#fff!important;color:#292d31!important}
a{color:#7a5423!important}
.topbar,.site-header{background:rgba(251,247,239,.88)!important;border-color:rgba(143,119,84,.20)!important}
.logo{color:#132744!important}
.hero{background:transparent!important;border-bottom:1px solid rgba(143,119,84,.20)!important}
.hero-inner{max-width:760px!important;padding-top:34px!important;padding-bottom:22px!important}
.badge,.rail-kicker{background:transparent!important;color:#b98238!important;border-radius:0!important;padding:0!important}
.layout{max-width:1180px!important;grid-template-columns:minmax(0,760px) 270px!important;gap:54px!important}
.left{display:none!important}
.right,.right-rail{position:sticky!important;top:24px!important}
.panel,.card,.summary,.toc,.notice,.checklist,.faq details,.summary-grid,.topic-card,.related-card,.content-card,.info-card,.hero-actions{background:transparent!important;border-radius:0!important;box-shadow:none!important}
.panel,.card,.summary,.toc,.notice,.checklist,.faq details,.summary-grid,.topic-card,.related-card,.content-card,.info-card{border-left:0!important;border-right:0!important;border-top:1px solid rgba(143,119,84,.20)!important;border-bottom:1px solid rgba(143,119,84,.20)!important;padding:18px 2px!important}
.summary-grid,.card-grid,.hero-actions,.action-box{display:block!important}
.summary-grid>*,.card-grid>*,.hero-actions>*,.action-box>*{margin:0!important;border:0!important;border-bottom:1px solid rgba(143,119,84,.20)!important;border-radius:0!important;background:transparent!important;padding:15px 2px!important}
.primary,.rail-button,.hero-actions a{background:#132744!important;color:#fff!important;border-radius:8px!important;display:inline-block!important;padding:10px 14px!important}
article h2,.article-main h2{color:#132744!important}
th{background:rgba(185,130,56,.07)!important;color:#132744!important}
footer{background:transparent!important;color:#6c716f!important;border-top:1px solid rgba(143,119,84,.20)!important}
footer a{color:#7a5423!important}
@media(max-width:980px){.layout{display:block!important;max-width:820px!important}.right,.right-rail{position:static!important;padding-top:20px!important}}
</style>
'''.strip()

BLUE_REPLACEMENTS = {
    "#1769ff": "#132744", "#1457c9": "#132744", "#145fd7": "#7a5423",
    "#0d6efd": "#132744", "#2563eb": "#132744", "#1d4ed8": "#132744",
    "#3b82f6": "#132744", "#60a5fa": "#b98238", "#dce8ff": "#fbf7ef",
    "#eef4ff": "#fbf7ef", "#eef6ff": "#fbf7ef", "#cfe0ff": "rgba(143,119,84,.20)",
}

queue = json.loads(QUEUE_PATH.read_text(encoding="utf-8"))["queue"]
targets = [item for item in queue if item.get("blue_reasons") or item.get("card_reasons")]
changed: list[str] = []

for item in targets:
    path = ROOT / item["path"]
    if not path.exists():
        continue
    text = path.read_text(encoding="utf-8", errors="ignore")
    original = text
    for old, new in BLUE_REPLACEMENTS.items():
        text = text.replace(old, new).replace(old.upper(), new)
    text = re.sub(r"linear-gradient\([^)]*\)", "none", text, flags=re.I)
    if 'id="savingio-legacy-ui-remediation"' not in text:
        pos = text.lower().rfind("</head>")
        if pos >= 0:
            text = text[:pos] + OVERRIDE + "\n" + text[pos:]
    if text != original:
        path.write_text(text, encoding="utf-8")
        changed.append(item["path"])

lines = ["# Legacy UI remediation applied", "", f"- changed: {len(changed)}", ""]
lines.extend(f"- `{p}`" for p in changed)
REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
REPORT_PATH.write_text("\n".join(lines) + "\n", encoding="utf-8")
print(f"changed={len(changed)}")
