from __future__ import annotations

import argparse
import json
import re
from dataclasses import dataclass
from datetime import datetime, timezone
from html import escape
from pathlib import Path


VERSION = "1.0.0"
MARKER = "data-savingio-problem-path"
SPECIAL_CHAIN = [
    {
        "title": "장기수선충당금 소유자 부담과 임차인 반환 확인",
        "href": "/articles/장기수선충당금-소유자-부담과-임차인-반환-확인-107af18f.html",
    },
    {
        "title": "수도 누수 자가진단 방법",
        "href": "/articles/home-water-leak-self-check.html",
    },
    {
        "title": "보험 중복 가입 확인 방법",
        "href": "/articles/duplicate-indemnity-insurance-check.html",
    },
]


@dataclass(frozen=True)
class ArticleNode:
    title: str
    href: str
    large: str
    middle: str
    stage: str


def now_iso() -> str:
    return datetime.now(timezone.utc).astimezone().isoformat(timespec="seconds")


def load_nodes(root: Path) -> tuple[list[ArticleNode], dict[str, list[ArticleNode]]]:
    payload = json.loads((root / "data" / "savingio-brain-data.json").read_text(encoding="utf-8"))
    nodes: list[ArticleNode] = []
    clusters: dict[str, list[ArticleNode]] = {}
    for large, middle_map in payload.get("tree", {}).items():
        for middle, stage_map in middle_map.items():
            cluster: list[ArticleNode] = []
            for stage, entries in stage_map.items():
                for entry in entries:
                    href = str(entry.get("href", ""))
                    if entry.get("type") != "article" or not href.startswith("/articles/"):
                        continue
                    node = ArticleNode(str(entry.get("title", "")).strip(), href, large, middle, stage)
                    nodes.append(node)
                    cluster.append(node)
            for node in cluster:
                clusters[node.href] = cluster
    return nodes, clusters


def existing_article_hrefs(root: Path) -> list[str]:
    return [
        f"/articles/{path.name}"
        for path in sorted((root / "articles").glob("*.html"))
        if path.name.lower() != "index.html"
    ]


def build_batches(root: Path, batch_size: int = 50) -> tuple[list[list[str]], dict[str, list[ArticleNode]]]:
    nodes, clusters = load_nodes(root)
    existing = set(existing_article_hrefs(root))
    special = [item["href"] for item in SPECIAL_CHAIN if item["href"] in existing]
    ordered = special + [node.href for node in nodes if node.href in existing and node.href not in special]
    ordered.extend(href for href in sorted(existing) if href not in ordered)
    batches = [ordered[index : index + batch_size] for index in range(0, len(ordered), batch_size)]
    return batches, clusters


def special_nodes() -> list[ArticleNode]:
    return [ArticleNode(item["title"], item["href"], "생활 문제 해결", "주거·누수", "해결 순서") for item in SPECIAL_CHAIN]


def fallback_cluster(root: Path, current_href: str) -> list[ArticleNode]:
    current_path = root / current_href.lstrip("/")
    html = current_path.read_text(encoding="utf-8")
    hrefs = [current_href]
    for href in re.findall(r'href=["\'](/articles/[^"\'#?]+\.html)["\']', html, re.IGNORECASE):
        if href not in hrefs and (root / href.lstrip("/")).is_file():
            hrefs.append(href)
        if len(hrefs) >= 6:
            break
    nodes: list[ArticleNode] = []
    for href in hrefs:
        target = root / href.lstrip("/")
        target_html = target.read_text(encoding="utf-8")
        heading = re.search(r'<h1\b[^>]*>(.*?)</h1>', target_html, re.IGNORECASE | re.DOTALL)
        title = re.sub(r'<[^>]+>', '', heading.group(1)).strip() if heading else target.stem
        nodes.append(ArticleNode(title, href, "생활 지도", "연결 질문", "다음 확인"))
    return nodes


def render_path(current_href: str, cluster: list[ArticleNode]) -> str:
    cards: list[str] = []
    for index, node in enumerate(cluster, 1):
        current = ' aria-current="step"' if node.href == current_href else ""
        state = "현재 글" if current else "다음 확인"
        cards.append(
            f'<a class="savingio-path-step" href="{escape(node.href, quote=True)}"{current}>'
            f'<strong>{index}. {escape(node.title)}</strong><span>{state}</span></a>'
        )
    return (
        f'<section class="savingio-problem-path" {MARKER}="v1">'
        '<h2>이 문제를 끝내는 확인 순서</h2>'
        '<p>현재 글만 보고 끝내지 말고, 원인 확인부터 비용·보험 점검까지 순서대로 확인하세요.</p>'
        f'<div class="savingio-path-steps">{"".join(cards)}</div></section>'
    )


def upsert_path(html: str, block: str) -> tuple[str, bool]:
    existing = re.compile(
        rf'<section\b[^>]*{MARKER}=["\'][^"\']+["\'][^>]*>.*?</section>',
        re.IGNORECASE | re.DOTALL,
    )
    if existing.search(html):
        updated = existing.sub(block, html, count=1)
        return updated, updated != html
    related = re.search(r'<section><h2>이것도 같이 확인하세요</h2>', html, re.IGNORECASE)
    if related:
        return html[: related.start()] + block + html[related.start() :], True
    article_close = re.search(r'</article\s*>', html, re.IGNORECASE)
    if article_close:
        return html[: article_close.start()] + block + html[article_close.start() :], True
    main_close = re.search(r'</main\s*>', html, re.IGNORECASE)
    if main_close:
        return html[: main_close.start()] + block + html[main_close.start() :], True
    body_close = re.search(r'</body\s*>', html, re.IGNORECASE)
    if body_close:
        return html[: body_close.start()] + block + html[body_close.start() :], True
    return html, False


def run(root: Path, batch_number: int, batch_size: int = 50, apply: bool = False) -> dict:
    root = root.resolve()
    batches, clusters = build_batches(root, batch_size=batch_size)
    if batch_number < 1 or batch_number > len(batches):
        raise ValueError(f"batch_number must be between 1 and {len(batches)}")
    selected = batches[batch_number - 1]
    special = special_nodes()
    changed: list[str] = []
    unchanged: list[str] = []
    skipped: list[str] = []
    for href in selected:
        path = root / href.lstrip("/")
        cluster = special if href in {node.href for node in special} else clusters.get(href, [])
        cluster = [node for node in cluster if (root / node.href.lstrip("/")).is_file()]
        if len(cluster) < 2:
            cluster = fallback_cluster(root, href)
            if len(cluster) < 2:
                skipped.append(path.relative_to(root).as_posix())
                continue
        original = path.read_text(encoding="utf-8")
        updated, did_change = upsert_path(original, render_path(href, cluster))
        if did_change:
            changed.append(path.relative_to(root).as_posix())
            if apply:
                path.write_text(updated, encoding="utf-8", newline="")
        else:
            unchanged.append(path.relative_to(root).as_posix())

    manifest = {
        "version": VERSION,
        "created_at": now_iso(),
        "article_count": sum(len(batch) for batch in batches),
        "batch_size": batch_size,
        "batch_count": len(batches),
        "batches": [
            {"number": index, "count": len(batch), "articles": batch}
            for index, batch in enumerate(batches, 1)
        ],
        "planned_missing_nodes": [
            {"title": "윗집에서 물이 샐 때 책임·증거·수리 순서", "status": "research_required"},
            {"title": "일상생활배상책임보험(일배책) 누수 보상 확인", "status": "research_required"},
        ],
    }
    report = {
        "version": VERSION,
        "created_at": now_iso(),
        "batch_number": batch_number,
        "selected_count": len(selected),
        "changed_count": len(changed),
        "unchanged_count": len(unchanged),
        "skipped_without_cluster_count": len(skipped),
        "changed_files": changed,
        "unchanged_files": unchanged,
        "skipped_files": skipped,
        "apply": apply,
        "pass": len(selected) == len(changed) + len(unchanged) + len(skipped),
    }
    output = root / "factory" / "output" / "article_connection_batches"
    output.mkdir(parents=True, exist_ok=True)
    (output / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    (output / f"batch-{batch_number:02d}-report.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    return report


def main() -> int:
    parser = argparse.ArgumentParser(description="Apply Savingio article relationship paths in fixed-size batches.")
    parser.add_argument("--project-root", default=".")
    parser.add_argument("--batch", type=int, required=True)
    parser.add_argument("--batch-size", type=int, default=50)
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    report = run(Path(args.project_root), args.batch, batch_size=args.batch_size, apply=args.apply)
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0 if report["pass"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
