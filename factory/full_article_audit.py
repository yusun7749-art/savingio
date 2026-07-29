from __future__ import annotations

import csv
import html
import json
import math
import re
from collections import Counter
from pathlib import Path
from urllib.parse import unquote, urlparse

ROOT = Path(__file__).resolve().parents[1]
ARTICLES = ROOT / "articles"
OUT = ROOT / "factory" / "FULL_ARTICLE_AUDIT"
OUT.mkdir(parents=True, exist_ok=True)

MIN_CHARS = 5000
DUP_THRESHOLD = 0.70
TOKEN_RE = re.compile(r"[가-힣A-Za-z0-9]{2,}")
TAG_RE = re.compile(r"<[^>]+>")
SCRIPT_STYLE_RE = re.compile(r"<(script|style)\b[^>]*>.*?</\1>", re.I | re.S)
HREF_RE = re.compile(r"href=[\"']([^\"'#]+)(?:#[^\"']*)?[\"']", re.I)
TITLE_RE = re.compile(r"<title>(.*?)</title>", re.I | re.S)
H1_RE = re.compile(r"<h1\b[^>]*>(.*?)</h1>", re.I | re.S)

STOP = {
    "savingio", "세이빙이오", "확인", "방법", "가이드", "정리", "체크", "관련", "이용", "기준", "내용",
    "우리", "실제", "먼저", "다음", "경우", "위해", "통해", "대한", "있는", "하는", "할수", "있습니다",
}

DNA_MARKERS = [
    "breadcrumb", "lead", "작성·검수", "5초 결론", "30초", "목차", "faq", "related", "right-rail"
]


def clean_text(raw: str) -> str:
    raw = SCRIPT_STYLE_RE.sub(" ", raw)
    raw = TAG_RE.sub(" ", raw)
    raw = html.unescape(raw)
    raw = re.sub(r"\s+", " ", raw).strip()
    return raw


def extract(pattern: re.Pattern[str], raw: str) -> str:
    m = pattern.search(raw)
    return clean_text(m.group(1)) if m else ""


def tokenize(text: str) -> Counter[str]:
    toks = [t.lower() for t in TOKEN_RE.findall(text) if t.lower() not in STOP]
    return Counter(toks)


def cosine(a: Counter[str], b: Counter[str]) -> float:
    if not a or not b:
        return 0.0
    dot = sum(v * b.get(k, 0) for k, v in a.items())
    na = math.sqrt(sum(v * v for v in a.values()))
    nb = math.sqrt(sum(v * v for v in b.values()))
    return dot / (na * nb) if na and nb else 0.0


def resolve_internal(source: Path, href: str) -> Path | None:
    parsed = urlparse(href)
    if parsed.scheme in {"http", "https", "mailto", "tel", "javascript", "data"} or href.startswith("//"):
        return None
    path = unquote(parsed.path)
    if not path or path.startswith("#"):
        return None
    if path.startswith("/"):
        candidate = ROOT / path.lstrip("/")
    else:
        candidate = source.parent / path
    candidate = candidate.resolve()
    try:
        candidate.relative_to(ROOT.resolve())
    except ValueError:
        return None
    if candidate.is_dir():
        candidate = candidate / "index.html"
    elif candidate.suffix == "":
        html_candidate = candidate.with_suffix(".html")
        index_candidate = candidate / "index.html"
        if html_candidate.exists():
            candidate = html_candidate
        elif index_candidate.exists():
            candidate = index_candidate
    return candidate


def main() -> None:
    files = sorted(p for p in ARTICLES.glob("*.html") if p.name.lower() != "index.html")
    rows: list[dict] = []
    token_docs: dict[str, Counter[str]] = {}

    for path in files:
        raw = path.read_text(encoding="utf-8", errors="replace")
        text = clean_text(raw)
        title = extract(TITLE_RE, raw)
        h1 = extract(H1_RE, raw)
        links = sorted(set(HREF_RE.findall(raw)))
        broken = []
        for href in links:
            target = resolve_internal(path, href)
            if target is not None and not target.exists():
                broken.append(href)

        dna_missing = [m for m in DNA_MARKERS if m.lower() not in raw.lower()]
        token_docs[path.as_posix()] = tokenize(f"{h1} {title} {text}")
        rows.append({
            "path": path.relative_to(ROOT).as_posix(),
            "url": f"https://savingio.com/{path.relative_to(ROOT).as_posix()}",
            "title": title,
            "h1": h1,
            "char_count": len(text),
            "under_5000": len(text) < MIN_CHARS,
            "broken_links": broken,
            "broken_link_count": len(broken),
            "dna_missing": dna_missing,
            "dna_complete": not dna_missing,
            "duplicate_candidates": [],
        })

    by_path = {r["path"]: r for r in rows}
    paths = list(token_docs)
    duplicate_pairs = []
    for i, p1 in enumerate(paths):
        for p2 in paths[i + 1:]:
            score = cosine(token_docs[p1], token_docs[p2])
            if score >= DUP_THRESHOLD:
                rp1 = Path(p1).relative_to(ROOT).as_posix()
                rp2 = Path(p2).relative_to(ROOT).as_posix()
                duplicate_pairs.append({"a": rp1, "b": rp2, "score": round(score, 4)})
                by_path[rp1]["duplicate_candidates"].append({"path": rp2, "score": round(score, 4)})
                by_path[rp2]["duplicate_candidates"].append({"path": rp1, "score": round(score, 4)})

    counts = Counter()
    for r in rows:
        flags = []
        if r["under_5000"]:
            flags.append("5천자 미달")
        if r["duplicate_candidates"]:
            flags.append("중복 의심")
        if r["broken_link_count"]:
            flags.append("깨진 링크")
        if r["dna_complete"] and not flags:
            final = "완료"
        elif not flags and not r["dna_complete"]:
            final = "정상"
        else:
            final = " / ".join(flags)
        r["final_status"] = final
        r["priority"] = (
            "P0" if r["broken_link_count"] else
            "P1" if r["duplicate_candidates"] else
            "P2" if r["under_5000"] else
            "P3" if not r["dna_complete"] else "DONE"
        )
        counts[final] += 1

    summary = {
        "article_count": len(rows),
        "completed": sum(1 for r in rows if r["final_status"] == "완료"),
        "normal_needs_dna": sum(1 for r in rows if r["final_status"] == "정상"),
        "under_5000": sum(1 for r in rows if r["under_5000"]),
        "duplicate_suspected_articles": sum(1 for r in rows if r["duplicate_candidates"]),
        "duplicate_pairs": len(duplicate_pairs),
        "broken_link_articles": sum(1 for r in rows if r["broken_link_count"]),
        "broken_links_total": sum(r["broken_link_count"] for r in rows),
        "thresholds": {"minimum_visible_characters": MIN_CHARS, "duplicate_cosine": DUP_THRESHOLD},
    }

    payload = {"summary": summary, "articles": rows, "duplicate_pairs": duplicate_pairs}
    (OUT / "full-article-audit.json").write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")

    fields = ["path", "url", "title", "h1", "char_count", "under_5000", "broken_link_count", "broken_links", "dna_complete", "dna_missing", "duplicate_candidates", "final_status", "priority"]
    with (OUT / "full-article-audit.csv").open("w", encoding="utf-8-sig", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fields)
        w.writeheader()
        for r in rows:
            out = r.copy()
            for key in ("broken_links", "dna_missing", "duplicate_candidates"):
                out[key] = json.dumps(out[key], ensure_ascii=False)
            w.writerow({k: out[k] for k in fields})

    md = [
        "# Savingio 171개 글 전수 감사", "",
        f"- 전체 글: **{summary['article_count']}개**",
        f"- 완료: **{summary['completed']}개**",
        f"- 5천자 미달: **{summary['under_5000']}개**",
        f"- 중복 의심 글: **{summary['duplicate_suspected_articles']}개** / 중복 쌍 **{summary['duplicate_pairs']}개**",
        f"- 깨진 링크 보유 글: **{summary['broken_link_articles']}개** / 깨진 링크 **{summary['broken_links_total']}개**",
        f"- DNA 보강 필요 정상 글: **{summary['normal_needs_dna']}개**", "",
        "| 우선순위 | 파일 | 글자수 | 중복 후보 | 깨진 링크 | DNA | 최종 판정 |",
        "|---|---|---:|---:|---:|---|---|",
    ]
    order = {"P0": 0, "P1": 1, "P2": 2, "P3": 3, "DONE": 4}
    for r in sorted(rows, key=lambda x: (order[x["priority"]], x["char_count"], x["path"])):
        md.append(f"| {r['priority']} | `{r['path']}` | {r['char_count']:,} | {len(r['duplicate_candidates'])} | {r['broken_link_count']} | {'완료' if r['dna_complete'] else '보강'} | {r['final_status']} |")
    (OUT / "full-article-audit.md").write_text("\n".join(md) + "\n", encoding="utf-8")

    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
