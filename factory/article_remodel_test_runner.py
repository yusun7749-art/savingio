from __future__ import annotations

import argparse
import csv
import json
import re
import shutil
from dataclasses import dataclass, asdict
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse

VERSION = "1.0.0"
STYLE_HREF = "/css/article-layout-dna.css?v=1"
STYLE_MARKER = "data-savingio-layout-dna"


class ArticleParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.title = ""
        self.h1_count = 0
        self.meta_description = ""
        self.canonical = ""
        self.links: list[str] = []
        self._in_title = False

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = {k.lower(): (v or "") for k, v in attrs}
        tag = tag.lower()
        if tag == "title":
            self._in_title = True
        elif tag == "h1":
            self.h1_count += 1
        elif tag == "meta" and values.get("name", "").lower() == "description":
            self.meta_description = values.get("content", "").strip()
        elif tag == "link" and values.get("rel", "").lower() == "canonical":
            self.canonical = values.get("href", "").strip()
        elif tag == "a":
            href = values.get("href", "").strip()
            if href:
                self.links.append(href)

    def handle_endtag(self, tag: str) -> None:
        if tag.lower() == "title":
            self._in_title = False

    def handle_data(self, data: str) -> None:
        if self._in_title:
            self.title += data


@dataclass
class ArticleResult:
    source: str
    output: str
    transformed: bool
    title: bool
    meta_description: bool
    canonical: bool
    one_h1: bool
    layout_css: bool
    body_class: bool
    internal_links_checked: int
    broken_internal_links: list[str]
    warnings: list[str]
    error: str | None = None

    @property
    def structural_pass(self) -> bool:
        return bool(
            self.error is None
            and self.transformed
            and self.title
            and self.meta_description
            and self.canonical
            and self.one_h1
            and self.layout_css
            and self.body_class
        )


def now_iso() -> str:
    return datetime.now(timezone.utc).astimezone().isoformat(timespec="seconds")


def add_body_class(html: str) -> tuple[str, bool]:
    pattern = re.compile(r"<body\b([^>]*)>", re.IGNORECASE)
    match = pattern.search(html)
    if not match:
        return html, False
    attrs = match.group(1)
    class_match = re.search(r'\bclass\s*=\s*(["\'])(.*?)\1', attrs, re.IGNORECASE | re.DOTALL)
    if class_match:
        classes = class_match.group(2).split()
        if "savingio-article-dna" not in classes:
            classes.append("savingio-article-dna")
        new_class = f'class={class_match.group(1)}{" ".join(classes)}{class_match.group(1)}'
        new_attrs = attrs[: class_match.start()] + new_class + attrs[class_match.end() :]
    else:
        new_attrs = attrs + ' class="savingio-article-dna"'
    replacement = f"<body{new_attrs}>"
    return html[: match.start()] + replacement + html[match.end() :], True


def ensure_single_h1(html: str) -> tuple[str, bool]:
    parser = parse_article(html)
    if parser.h1_count == 1:
        return html, True
    if parser.h1_count == 0:
        updated, count = re.subn(r"<h2\b", "<h1", html, count=1, flags=re.IGNORECASE)
        if count:
            updated = re.sub(r"</h2\s*>", "</h1>", updated, count=1, flags=re.IGNORECASE)
            return updated, True
        title = parser.title.strip()
        body = re.search(r"<body\b[^>]*>", html, re.IGNORECASE)
        if title and body:
            h1 = f'<h1 class="factory-generated-h1">{title}</h1>'
            return html[:body.end()] + h1 + html[body.end():], True
    return html, False


def inject_layout_css(html: str) -> tuple[str, bool]:
    if STYLE_MARKER in html or "article-layout-dna.css" in html:
        return html, True
    link = f'<link rel="stylesheet" href="{STYLE_HREF}" {STYLE_MARKER}="v1">'
    head_close = re.search(r"</head\s*>", html, re.IGNORECASE)
    if not head_close:
        return html, False
    return html[: head_close.start()] + link + "\n" + html[head_close.start() :], True


def resolve_internal(root: Path, href: str) -> Path | None:
    if href.startswith(("#", "mailto:", "tel:", "javascript:")):
        return None
    parsed = urlparse(href)
    if parsed.scheme in {"http", "https"}:
        if parsed.netloc not in {"savingio.com", "www.savingio.com"}:
            return None
        path = parsed.path
    else:
        path = parsed.path
    if not path or not path.startswith("/"):
        return None
    rel = path.lstrip("/")
    candidates = [root / rel]
    if path.endswith("/"):
        candidates.append(root / rel / "index.html")
    elif not Path(rel).suffix:
        candidates.extend([root / f"{rel}.html", root / rel / "index.html"])
    for candidate in candidates:
        if candidate.is_file():
            return candidate
    return candidates[0]


def parse_article(html: str) -> ArticleParser:
    parser = ArticleParser()
    parser.feed(html)
    parser.close()
    return parser


def remodel_one(root: Path, source: Path, output: Path) -> ArticleResult:
    warnings: list[str] = []
    try:
        original = source.read_text(encoding="utf-8")
        updated, body_ok = add_body_class(original)
        updated, h1_ok = ensure_single_h1(updated)
        updated, css_ok = inject_layout_css(updated)
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(updated, encoding="utf-8", newline="")

        parser = parse_article(updated)
        broken: list[str] = []
        checked = 0
        for href in parser.links:
            target = resolve_internal(root, href)
            if target is None:
                continue
            checked += 1
            if not target.is_file():
                broken.append(href)
        if broken:
            warnings.append(f"broken_internal_links:{len(broken)}")
        if len(parser.meta_description) > 170:
            warnings.append("meta_description_over_170")
        if len(parser.title.strip()) > 75:
            warnings.append("title_over_75")

        return ArticleResult(
            source=source.relative_to(root).as_posix(),
            output=output.relative_to(root).as_posix(),
            transformed=updated != original or (body_ok and css_ok),
            title=bool(parser.title.strip()),
            meta_description=bool(parser.meta_description),
            canonical=bool(parser.canonical),
            one_h1=h1_ok and parser.h1_count == 1,
            layout_css=css_ok and "article-layout-dna.css" in updated,
            body_class=body_ok and "savingio-article-dna" in updated,
            internal_links_checked=checked,
            broken_internal_links=sorted(set(broken)),
            warnings=warnings,
        )
    except Exception as exc:  # isolated per article
        return ArticleResult(
            source=source.relative_to(root).as_posix(),
            output=output.relative_to(root).as_posix(),
            transformed=False,
            title=False,
            meta_description=False,
            canonical=False,
            one_h1=False,
            layout_css=False,
            body_class=False,
            internal_links_checked=0,
            broken_internal_links=[],
            warnings=[],
            error=f"{type(exc).__name__}: {exc}",
        )


def run(project_root: Path, clean: bool = True) -> dict:
    root = project_root.resolve()
    articles_dir = root / "articles"
    if not articles_dir.is_dir():
        raise FileNotFoundError(f"articles directory not found: {articles_dir}")

    output_root = root / "factory" / "output" / "article_remodel_test"
    site_root = output_root / "site"
    if clean and output_root.exists():
        shutil.rmtree(output_root)
    (site_root / "articles").mkdir(parents=True, exist_ok=True)
    (site_root / "css").mkdir(parents=True, exist_ok=True)

    css_source = root / "css" / "article-layout-dna.css"
    if not css_source.is_file():
        raise FileNotFoundError(f"layout DNA stylesheet not found: {css_source}")
    shutil.copy2(css_source, site_root / "css" / css_source.name)

    article_files = sorted(
        p for p in articles_dir.glob("*.html")
        if p.name.lower() != "index.html"
    )
    results: list[ArticleResult] = []
    for source in article_files:
        output = site_root / "articles" / source.name
        results.append(remodel_one(root, source, output))

    errors = [r for r in results if r.error]
    structural_failures = [r for r in results if not r.structural_pass]
    broken_articles = [r for r in results if r.broken_internal_links]
    report = {
        "version": VERSION,
        "mode": "isolated_full_article_remodel_test",
        "created_at": now_iso(),
        "project_root": str(root),
        "source_count": len(article_files),
        "output_count": sum(1 for r in results if (root / r.output).is_file()),
        "structural_pass_count": sum(1 for r in results if r.structural_pass),
        "structural_fail_count": len(structural_failures),
        "error_count": len(errors),
        "articles_with_broken_internal_links": len(broken_articles),
        "broken_internal_link_count": sum(len(r.broken_internal_links) for r in results),
        "live_articles_modified": False,
        "sandbox_path": site_root.relative_to(root).as_posix(),
        "pass": len(article_files) > 0 and not errors and len(article_files) == sum(1 for r in results if (root / r.output).is_file()),
        "results": [asdict(r) | {"structural_pass": r.structural_pass} for r in results],
    }

    output_root.mkdir(parents=True, exist_ok=True)
    (output_root / "report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    with (output_root / "report.csv").open("w", encoding="utf-8-sig", newline="") as fp:
        writer = csv.writer(fp)
        writer.writerow([
            "source", "structural_pass", "error", "title", "meta_description", "canonical",
            "one_h1", "layout_css", "body_class", "internal_links_checked",
            "broken_internal_link_count", "warnings",
        ])
        for r in results:
            writer.writerow([
                r.source, r.structural_pass, r.error or "", r.title, r.meta_description, r.canonical,
                r.one_h1, r.layout_css, r.body_class, r.internal_links_checked,
                len(r.broken_internal_links), "|".join(r.warnings),
            ])
    summary = {
        k: report[k]
        for k in [
            "version", "mode", "created_at", "source_count", "output_count", "structural_pass_count",
            "structural_fail_count", "error_count", "articles_with_broken_internal_links",
            "broken_internal_link_count", "live_articles_modified", "sandbox_path", "pass",
        ]
    }
    (output_root / "summary.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")
    return summary


def main() -> int:
    parser = argparse.ArgumentParser(description="Run an isolated remodel test across all Savingio articles.")
    parser.add_argument("--project-root", default=".")
    parser.add_argument("--no-clean", action="store_true")
    args = parser.parse_args()
    report = run(Path(args.project_root), clean=not args.no_clean)
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0 if report["pass"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
