from __future__ import annotations

import argparse
import html
import json
import re
from html.parser import HTMLParser
from pathlib import Path


VERSION = "2.1.0"
SEARCH_RUNTIME_VERSION = "2"

SYNONYM_GROUPS = [
    {"전기요금", "전기세", "전기료"},
    {"수도요금", "수도세", "수도료"},
    {"도시가스", "가스비", "가스요금"},
    {"휴대폰요금", "핸드폰요금", "통신비", "휴대전화요금"},
    {"급여", "월급", "임금", "봉급"},
    {"퇴직금", "퇴직급여", "퇴직정산"},
    {"지원금", "정부지원", "복지혜택", "정부혜택"},
    {"환급금", "환급", "돌려받는돈", "미수령금"},
    {"재산세", "주택세금", "부동산세금"},
    {"부가가치세", "부가세", "vat"},
    {"자동차보험", "차보험", "차량보험"},
    {"신용점수", "신용등급", "신용관리"},
    {"장기수선충당금", "장기수선금", "아파트수선충당금"},
]


class ArticleMetaParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.title = ""
        self.description = ""
        self.h1 = ""
        self.path_text: list[str] = []
        self.search_intents = ""
        self.is_redirect = False
        self._capture: str | None = None
        self._path_depth = 0

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = {key: value or "" for key, value in attrs}
        if tag == "title":
            self._capture = "title"
        elif tag == "h1":
            self._capture = "h1"
        elif tag == "meta" and values.get("name", "").lower() == "description":
            self.description = values.get("content", "").strip()
        elif tag == "meta" and values.get("name", "").lower() == "savingio:search-intents":
            self.search_intents = values.get("content", "").strip()
        elif tag == "meta" and values.get("http-equiv", "").lower() == "refresh":
            self.is_redirect = True
        if tag == "section" and "data-savingio-problem-path" in values:
            self._path_depth = 1
        elif self._path_depth:
            self._path_depth += 1

    def handle_endtag(self, tag: str) -> None:
        if tag in {"title", "h1"}:
            self._capture = None
        if self._path_depth:
            self._path_depth -= 1

    def handle_data(self, data: str) -> None:
        value = " ".join(data.split())
        if not value:
            return
        if self._capture == "title":
            self.title += value
        elif self._capture == "h1":
            self.h1 += value
        if self._path_depth:
            self.path_text.append(value)


def compact(value: str) -> str:
    return re.sub(r"[^0-9a-zA-Z가-힣]+", "", value).lower()


def expand_synonyms(terms: set[str]) -> set[str]:
    haystack = " ".join(terms)
    compact_haystack = compact(haystack)
    expanded = set(terms)
    for group in SYNONYM_GROUPS:
        if any(compact(term) in compact_haystack for term in group):
            expanded.update(group)
    return expanded


def article_meta(path: Path) -> dict[str, str]:
    parser = ArticleMetaParser()
    parser.feed(path.read_text(encoding="utf-8"))
    parser.close()
    return {
        "title": parser.h1.strip() or parser.title.split("|")[0].strip() or path.stem,
        "description": parser.description,
        "path": " ".join(parser.path_text),
        "search_intents": parser.search_intents,
        "is_redirect": parser.is_redirect,
    }


def build(root: Path) -> dict:
    root = root.resolve()
    brain_path = root / "data" / "savingio-brain-data.json"
    brain = json.loads(brain_path.read_text(encoding="utf-8"))
    article_files = [path for path in sorted((root / "articles").glob("*.html")) if path.name.lower() != "index.html"]
    parsed = {f"/articles/{path.name}": article_meta(path) for path in article_files}
    redirect_hrefs = {
        href
        for href, meta in parsed.items()
        if meta["is_redirect"]
        or meta["title"].startswith("페이지 이동")
        or Path(href).name.startswith("#U")
    }
    for middles in brain.get("tree", {}).values():
        for smalls in middles.values():
            for small, entries in list(smalls.items()):
                smalls[small] = [entry for entry in entries if str(entry.get("href", "")) not in redirect_hrefs]
    hierarchy: dict[str, set[str]] = {}
    entries_by_href: dict[str, list[dict]] = {}
    for large, middles in brain.get("tree", {}).items():
        for middle, smalls in middles.items():
            for small, entries in smalls.items():
                for entry in entries:
                    href = str(entry.get("href", ""))
                    if not href.startswith("/articles/"):
                        continue
                    hierarchy.setdefault(href, set()).update({large, middle, small, str(entry.get("title", ""))})
                    entries_by_href.setdefault(href, []).append(entry)

    index: dict[str, dict] = {}
    for path in article_files:
        href = f"/articles/{path.name}"
        if href in redirect_hrefs:
            continue
        meta = parsed[href]
        self_terms = {meta["title"], meta["description"], *hierarchy.get(href, set())}
        self_terms = expand_synonyms({term for term in self_terms if term})
        relationship_terms = {meta["path"]} if meta["path"] else set()
        exact_queries = [value.strip() for value in meta["search_intents"].split(",") if value.strip()]
        keywords = " ".join(sorted(self_terms | relationship_terms | set(exact_queries)))
        index[href] = {
            "title": meta["title"],
            "description": meta["description"],
            "keywords": keywords,
            "exact_queries": exact_queries,
        }
        for entry in entries_by_href.get(href, []):
            entry["search_keywords"] = keywords
            entry["exact_queries"] = exact_queries

    missing_brain = [href for href in index if href not in entries_by_href]
    if missing_brain:
        catch_all = brain.setdefault("tree", {}).setdefault("생활 문제 해결", {}).setdefault("기타 연결 글", {})
        catch_all["전체 글 보완"] = [
            {
                "title": index[href]["title"],
                "href": href,
                "type": "article",
                "search_keywords": index[href]["keywords"],
            }
            for href in missing_brain
        ]

    brain["article_count"] = len(index)
    brain["search_index_version"] = VERSION
    brain_path.write_text(json.dumps(brain, ensure_ascii=False, indent=2), encoding="utf-8")
    (root / "data" / "savingio-brain-data.js").write_text(
        "window.SAVINGIO_BRAIN_DATA=" + json.dumps(brain, ensure_ascii=False, separators=(",", ":")) + ";\n",
        encoding="utf-8",
    )
    payload = {"version": VERSION, "count": len(index), "items": index}
    (root / "data" / "savingio-search-index.json").write_text(
        json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    home = root / "index.html"
    home_text = home.read_text(encoding="utf-8")
    if '/js/savingio-search-core.js' not in home_text:
        home_text = home_text.replace('<script>\nconst portalItems =', f'<script src="/js/savingio-search-core.js?v={SEARCH_RUNTIME_VERSION}"></script>\n<script>\nconst portalItems =', 1)
    home_text = re.sub(r'/js/savingio-search-core\.js\?v=\d+', f'/js/savingio-search-core.js?v={SEARCH_RUNTIME_VERSION}', home_text)
    portal_items = [[item["title"], item["description"], href, item["keywords"], item["exact_queries"]] for href, item in index.items()]
    home_text, count = re.subn(
        r"const portalItems = \[.*?\];\nconst searchInput=",
        "const portalItems = " + json.dumps(portal_items, ensure_ascii=False, separators=(",", ":")) + ";\nconst searchInput=",
        home_text,
        count=1,
        flags=re.DOTALL,
    )
    if count != 1:
        raise RuntimeError("home portalItems assignment not found")
    home.write_text(home_text, encoding="utf-8", newline="")

    listing = root / "articles" / "index.html"
    listing_text = listing.read_text(encoding="utf-8")
    for href in redirect_hrefs:
        listing_text = re.sub(r'<a\b[^>]*class="article-card"[^>]*href="' + re.escape(href) + r'"[^>]*>.*?</a>', '', listing_text, count=1, flags=re.DOTALL)
    if '/js/savingio-search-core.js' not in listing_text:
        listing_text = listing_text.replace('<script>const cards=', f'<script src="/js/savingio-search-core.js?v={SEARCH_RUNTIME_VERSION}"></script><script>const cards=', 1)
    listing_text = re.sub(r'/js/savingio-search-core\.js\?v=\d+', f'/js/savingio-search-core.js?v={SEARCH_RUNTIME_VERSION}', listing_text)
    for href, item in index.items():
        pattern = re.compile(r'(<a\b[^>]*class="article-card"[^>]*data-search=")[^"]*("[^>]*href="' + re.escape(href) + r'")')
        listing_text, _ = pattern.subn(
            lambda match: match.group(1) + html.escape(item["keywords"], quote=True) + match.group(2),
            listing_text,
            count=1,
        )
        card_pattern = re.compile(r'(<a\b[^>]*class="article-card"[^>]*)(href="' + re.escape(href) + r'")')
        def set_exact(match: re.Match[str]) -> str:
            prefix = re.sub(r'\sdata-exact-search="[^"]*"', '', match.group(1))
            exact = html.escape(",".join(item["exact_queries"]), quote=True)
            return f'{prefix}data-exact-search="{exact}" {match.group(2)}'
        listing_text, _ = card_pattern.subn(set_exact, listing_text, count=1)
    existing_hrefs = set(re.findall(r'class="article-card"[^>]*href="([^"]+)"', listing_text))
    missing_cards = []
    for href, item in index.items():
        if href in existing_hrefs:
            continue
        missing_cards.append(
            '<a class="article-card" data-category="생활정보" '
            f'data-search="{html.escape(item["keywords"], quote=True)}" data-exact-search="{html.escape(",".join(item["exact_queries"]), quote=True)}" href="{html.escape(href, quote=True)}">'
            '<span class="card-category">생활정보</span>'
            f'<h2>{html.escape(item["title"])}</h2><p>{html.escape(item["description"])}</p>'
            '<b>자세히 보기 →</b></a>'
        )
    if missing_cards:
        marker = '</section><div class="pager" id="pager"></div>'
        if marker not in listing_text:
            raise RuntimeError("article listing grid end marker not found")
        listing_text = listing_text.replace(marker, "".join(missing_cards) + marker, 1)
    old_search = "const per=12;function render(){const q=input.value.trim().toLowerCase();const filtered=cards.filter(c=>(category==='전체'||c.dataset.category===category)&&(!q||c.dataset.search.includes(q)))"
    new_search = "const per=12;const compactSearch=value=>String(value||'').toLowerCase().replace(/[^0-9a-z가-힣]+/gi,'');function render(){const q=compactSearch(input.value);const filtered=cards.filter(c=>(category==='전체'||c.dataset.category===category)&&(!q||compactSearch(c.dataset.search).includes(q))).sort((a,b)=>{const ax=compactSearch(a.dataset.exactSearch||'').includes(q)?1:0,bx=compactSearch(b.dataset.exactSearch||'').includes(q)?1:0;return bx-ax})"
    if old_search in listing_text:
        listing_text = listing_text.replace(old_search, new_search, 1)
    listing_text = re.sub(
        r"const per=12;const compactSearch=value=>String\(value\|\|''\)\.toLowerCase\(\)\.replace\(/\[\^0-9a-z가-힣\]\+/gi,''\);function render\(\)\{const q=compactSearch\(input\.value\);const filtered=.*?;cards\.forEach",
        "const per=12;function render(){const q=input.value;const filtered=cards.map(c=>({c,score:SavingioSearchCore.score({title:c.querySelector('h2').textContent,keywords:c.dataset.search,exactQueries:(c.dataset.exactSearch||'').split(',').filter(Boolean)},q)})).filter(v=>(category==='전체'||v.c.dataset.category===category)&&(!q||v.score>0)).sort((a,b)=>b.score-a.score).map(v=>v.c);cards.forEach",
        listing_text,
        count=1,
    )
    if "const initialQuery=new URLSearchParams(location.search).get('q');" not in listing_text:
        listing_text = listing_text.replace(
            "input.addEventListener('input',()=>{page=1;render()});",
            "const initialQuery=new URLSearchParams(location.search).get('q');if(initialQuery)input.value=initialQuery;input.addEventListener('input',()=>{page=1;render()});",
            1,
        )
    listing.write_text(listing_text, encoding="utf-8", newline="")
    return payload


def main() -> int:
    parser = argparse.ArgumentParser(description="Build the unified Savingio hierarchy and synonym search index.")
    parser.add_argument("--project-root", default=".")
    args = parser.parse_args()
    payload = build(Path(args.project_root))
    print(json.dumps({"version": payload["version"], "count": payload["count"]}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
