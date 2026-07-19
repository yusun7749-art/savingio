from __future__ import annotations

from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]

WARNING_BLOCK = re.compile(
    r"(?:\ufeff)?\s*Warning:\s*truncated output\s*\(original token count:\s*\d+\)\s*"
    r"Total output lines:\s*\d+\s*",
    re.IGNORECASE,
)


def clean_warning_text(text: str) -> str:
    previous = None
    while previous != text:
        previous = text
        text = WARNING_BLOCK.sub("", text)
    return text.lstrip()


def update_articles_index(text: str) -> str:
    # Remove the legacy update line above the page content.
    text = re.sub(
        r'<p class="article-meta"><strong>최종 업데이트</strong>.*?</p>',
        "",
        text,
        count=1,
        flags=re.DOTALL,
    )

    # Add a dedicated visual layer without changing the article dataset or scripts.
    marker = "</head>"
    if "articles-v3035" not in text and marker in text:
        css = r'''<style id="articles-v3035">
:root{--sv-navy:#132744;--sv-ink:#2d3033;--sv-muted:#6f747a;--sv-gold:#b98238;--sv-cream:#faf6ef}
body{background:
radial-gradient(circle at 48% 18%,rgba(255,255,255,.98) 0,rgba(255,255,255,.74) 24%,rgba(251,247,240,.62) 52%,rgba(249,244,236,.98) 100%);
color:var(--sv-ink)}
body:before,body:after{content:"";position:fixed;border-radius:50%;pointer-events:none;z-index:-1}
body:before{width:430px;height:430px;right:-150px;top:150px;border:1px solid rgba(185,130,56,.18);background:linear-gradient(145deg,rgba(247,236,219,.34),rgba(202,153,84,.14))}
body:after{width:360px;height:360px;left:-230px;bottom:40px;border:1px solid rgba(174,181,184,.20);background:linear-gradient(145deg,rgba(235,239,240,.44),rgba(255,255,255,.10))}
.site-header{background:transparent!important;border-bottom:0!important;box-shadow:none!important}
.header-inner{max-width:1240px!important;padding:22px 28px!important}
.logo{font-family:Georgia,"Times New Roman",serif!important;font-size:34px!important;color:var(--sv-navy)!important;letter-spacing:-1px!important}
.site-header .nav{display:none!important}
.info-shell{max-width:1120px!important;margin:auto!important;padding:116px 28px 80px!important}
.info-hero{padding:12px 0 20px!important;background:transparent!important;border:0!important}
.info-hero h1{font-family:"Noto Serif KR",serif!important;font-size:clamp(38px,4.5vw,58px)!important;line-height:1.3!important;letter-spacing:-2.4px!important;color:var(--sv-ink)!important;margin:0 0 12px!important}
.info-hero p{font-size:16px!important;color:#5f646a!important;margin:0!important}
.search-box{margin-top:16px!important;background:transparent!important;border:0!important;border-radius:0!important;padding:0!important;box-shadow:none!important}
.search-box input{height:58px!important;padding:0 20px!important;border:1px solid rgba(19,39,68,.13)!important;border-radius:16px!important;background:rgba(255,255,255,.78)!important;box-shadow:0 10px 28px rgba(76,65,52,.055)!important;font-size:15px!important;color:var(--sv-ink)!important}
.category-row{gap:7px!important;margin-top:12px!important}
.category-row button{padding:8px 12px!important;border-radius:999px!important;border:1px solid rgba(19,39,68,.12)!important;background:rgba(255,255,255,.60)!important;color:#4f555d!important;font-size:12px!important;box-shadow:none!important}
.category-row button.active{background:var(--sv-navy)!important;color:#fff!important;border-color:var(--sv-navy)!important}
.result-head{margin:28px 0 10px!important;padding:0 2px!important;color:#5e646b!important;font-size:13px!important}
.result-head strong{color:var(--sv-navy)!important;font-size:15px!important}
.article-grid{display:grid!important;grid-template-columns:1fr!important;gap:0!important;border-top:1px solid rgba(19,39,68,.12)!important}
.article-card{display:grid!important;grid-template-columns:150px minmax(0,1fr) auto!important;grid-template-areas:"category title link" "category desc link"!important;align-items:center!important;column-gap:24px!important;min-height:0!important;padding:24px 4px!important;border:0!important;border-bottom:1px solid rgba(19,39,68,.10)!important;border-radius:0!important;background:transparent!important;box-shadow:none!important;color:var(--sv-ink)!important;transition:transform .18s ease,background .18s ease!important}
.article-card:hover{transform:translateX(4px)!important;background:rgba(255,255,255,.34)!important}
.article-card .card-category{grid-area:category!important;color:var(--sv-gold)!important;font-size:12px!important;font-weight:700!important;letter-spacing:.02em!important}
.article-card h2{grid-area:title!important;margin:0!important;font-size:19px!important;line-height:1.45!important;letter-spacing:-.5px!important;color:var(--sv-ink)!important}
.article-card p{grid-area:desc!important;margin:7px 0 0!important;color:#70757b!important;font-size:13px!important;line-height:1.6!important;display:-webkit-box!important;-webkit-line-clamp:2!important;-webkit-box-orient:vertical!important;overflow:hidden!important}
.article-card b{grid-area:link!important;color:var(--sv-navy)!important;font-size:12px!important;white-space:nowrap!important}
.pager{margin:28px 0!important}
@media(max-width:760px){
 .header-inner{padding:18px 16px!important}.logo{font-size:27px!important}
 .info-shell{padding:92px 16px 58px!important}.info-hero h1{font-size:36px!important;letter-spacing:-1.5px!important}
 .category-row{flex-wrap:nowrap!important;overflow-x:auto!important;padding-bottom:4px!important}.category-row button{flex:0 0 auto!important}
 .result-head span{display:none!important}
 .article-card{grid-template-columns:1fr auto!important;grid-template-areas:"category link" "title title" "desc desc"!important;row-gap:7px!important;padding:20px 2px!important}
 .article-card h2{font-size:17px!important}.article-card p{margin-top:0!important}
}
</style>'''
        text = text.replace(marker, css + marker, 1)

    return text


def main() -> None:
    changed: list[str] = []
    for path in ROOT.rglob("*.html"):
        if any(part in {".git", "node_modules"} for part in path.parts):
            continue
        original = path.read_text(encoding="utf-8", errors="replace")
        updated = clean_warning_text(original)
        if path == ROOT / "articles" / "index.html":
            updated = update_articles_index(updated)
        if updated != original:
            path.write_text(updated, encoding="utf-8", newline="\n")
            changed.append(path.relative_to(ROOT).as_posix())

    print(f"updated_files={len(changed)}")
    for item in changed:
        print(item)


if __name__ == "__main__":
    main()
