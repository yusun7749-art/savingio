from __future__ import annotations
from pathlib import Path
import re, shutil
from .utils import now_iso

def resolve_article(project_root: Path, page: str) -> Path | None:
    value = str(page or "").strip()
    if value.startswith(("http://","https://")):
        parts = value.split("/",3)
        value = "/" + (parts[3] if len(parts) > 3 else "")
    rel = value.lstrip("/")
    candidates = [project_root/rel]
    if not rel.endswith(".html"):
        candidates.extend([project_root/(rel+".html"), project_root/rel/"index.html"])
    return next((path for path in candidates if path.exists() and path.is_file()), None)

def _backup(project_root: Path, target: Path) -> Path:
    backup = project_root/"factory"/"backups"/"revenue-rework"/target.relative_to(project_root)
    backup.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(target, backup)
    return backup

def _rewrite_title_meta(html: str) -> str:
    title_match = re.search(r"<title>(.*?)</title>", html, re.I|re.S)
    if title_match:
        current = re.sub(r"\s+"," ",title_match.group(1)).strip()
        if "2026" not in current:
            improved = (current + " | 2026 기준과 확인 순서")[:60].rstrip(" |")
            html = html[:title_match.start(1)] + improved + html[title_match.end(1):]
    meta = re.search(r'(<meta\s+name=["\']description["\']\s+content=["\'])(.*?)(["\'])', html, re.I|re.S)
    if meta:
        current = re.sub(r"\s+"," ",meta.group(2)).strip().rstrip(" .")
        addition = " 적용 조건, 확인 순서, 주의사항을 실제 생활 기준으로 정리했습니다."
        improved = (current + addition)[:155]
        html = html[:meta.start(2)] + improved + html[meta.end(2):]
    return html

def _review_ad_layout(html: str) -> str:
    marker = "<!-- factory-revenue-intent-block -->"
    if marker in html:
        return html
    block = marker + '<section class="revenue-intent-block" data-factory-revenue="intent"><h2>이 글에서 바로 확인할 내용</h2><p>적용 대상, 비용 기준, 신청·확인 순서와 놓치기 쉬운 주의사항을 먼저 확인하세요.</p></section>'
    if '<section id="faq"' in html:
        return html.replace('<section id="faq"', block+'<section id="faq"', 1)
    return html.replace("</main>", block+"</main>", 1)

def _review_ad_visibility(html: str) -> str:
    marker = "<!-- factory-ad-visibility-slot -->"
    if marker in html:
        return html
    slot = marker + '<div class="factory-ad-slot" data-ad-slot="content-middle" data-ad-status="awaiting-approved-ad-code" aria-hidden="true"></div>'
    sections = list(re.finditer(r"<section\b", html, re.I))
    if len(sections) >= 3:
        pos = sections[len(sections)//2].start()
        return html[:pos] + slot + html[pos:]
    return html.replace("</main>", slot+"</main>", 1)

def _check_adsense_coverage(html: str) -> str:
    marker = "<!-- factory-adsense-coverage-check -->"
    if marker in html:
        return html
    tag = marker + '<meta name="factory-adsense-coverage" content="reviewed-pending-live-ad-data">'
    return html.replace("</head>", tag+"</head>", 1)

ACTION_HANDLERS = {
    "rewrite_title_meta": _rewrite_title_meta,
    "review_ad_layout_and_intent": _review_ad_layout,
    "review_ad_visibility": _review_ad_visibility,
    "check_adsense_coverage": _check_adsense_coverage,
}

def rewrite_article(project_root: Path, action: dict, execute: bool=False) -> dict:
    target = resolve_article(project_root, action.get("page",""))
    if not target:
        return {"status":"blocked","reason":"page_not_found","page":action.get("page")}
    kind = action.get("action")
    handler = ACTION_HANDLERS.get(kind)
    if not handler:
        return {"status":"skipped","reason":"unsupported_action","action":kind}
    original = target.read_text(encoding="utf-8")
    updated = handler(original)
    rel = target.relative_to(project_root).as_posix()
    if updated == original:
        return {"status":"skipped","reason":"idempotent_no_change","target":rel,"action":kind}
    if not execute:
        return {"status":"dry_run","target":rel,"action":kind,"original_chars":len(original),"updated_chars":len(updated)}
    backup = _backup(project_root, target)
    target.write_text(updated, encoding="utf-8")
    return {"status":"completed","target":rel,"backup":backup.relative_to(project_root).as_posix(),"action":kind,"original_chars":len(original),"updated_chars":len(updated),"created_at":now_iso()}
