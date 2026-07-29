from __future__ import annotations

import csv
import html
import json
import re
import time
from collections import Counter
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import unquote, urljoin, urlparse
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
ARTICLES = ROOT / "articles"
OUT = ROOT / "factory" / "SECOND_LINK_AUDIT"
OUT.mkdir(parents=True, exist_ok=True)
REDIRECTS_FILE = ROOT / "_redirects"
SITE = "https://savingio.com"

HREF_RE = re.compile(r"href=[\"']([^\"']+)[\"']", re.I)
SKIP_SCHEMES = {"mailto", "tel", "javascript", "data"}


def parse_redirects() -> dict[str, str]:
    redirects: dict[str, str] = {}
    if not REDIRECTS_FILE.exists():
        return redirects
    for raw in REDIRECTS_FILE.read_text(encoding="utf-8", errors="replace").splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        parts = line.split()
        if len(parts) >= 2 and "*" not in parts[0]:
            redirects[parts[0]] = parts[1]
    return redirects


def normalize_href(source: Path, href: str) -> tuple[str, str] | None:
    href = html.unescape(href.strip())
    if not href or href.startswith("#") or href.startswith("//"):
        return None
    parsed = urlparse(href)
    if parsed.scheme in SKIP_SCHEMES:
        return None
    if parsed.scheme in {"http", "https"}:
        if parsed.netloc.lower() not in {"savingio.com", "www.savingio.com"}:
            return None
        path = parsed.path or "/"
    elif parsed.scheme:
        return None
    else:
        path = parsed.path
        if not path:
            return None
        if not path.startswith("/"):
            source_url = "/" + source.relative_to(ROOT).as_posix()
            path = urlparse(urljoin(source_url, path)).path
    path = unquote(path)
    path = re.sub(r"/{2,}", "/", path)
    return href, path


def local_candidates(path: str) -> list[Path]:
    rel = path.lstrip("/")
    base = ROOT / rel
    candidates = [base]
    if path.endswith("/"):
        candidates.append(base / "index.html")
    elif not Path(path).suffix:
        candidates.extend([ROOT / f"{rel}.html", base / "index.html"])
    return candidates


def first_existing(path: str) -> Path | None:
    for candidate in local_candidates(path):
        try:
            candidate.resolve().relative_to(ROOT.resolve())
        except ValueError:
            continue
        if candidate.exists():
            return candidate
    return None


def follow_redirect(path: str, redirects: dict[str, str]) -> tuple[list[str], str]:
    chain: list[str] = []
    current = path
    seen: set[str] = set()
    for _ in range(10):
        if current in seen or current not in redirects:
            break
        seen.add(current)
        chain.append(current)
        target = redirects[current]
        parsed = urlparse(target)
        if parsed.scheme in {"http", "https"}:
            if parsed.netloc.lower() not in {"savingio.com", "www.savingio.com"}:
                return chain, target
            current = parsed.path or "/"
        else:
            current = parsed.path or target
    return chain, current


def live_check(path: str) -> tuple[str, int | None, str]:
    url = SITE + path
    req = Request(url, method="GET", headers={"User-Agent": "Savingio-Link-Audit/2.0"})
    try:
        with urlopen(req, timeout=12) as response:
            status = int(getattr(response, "status", 200))
            final_url = response.geturl()
            return ("LIVE_OK" if status < 400 else "LIVE_ERROR", status, final_url)
    except HTTPError as exc:
        return ("LIVE_404" if exc.code == 404 else "LIVE_ERROR", exc.code, url)
    except (URLError, TimeoutError, OSError) as exc:
        return ("LIVE_UNVERIFIED", None, str(exc))


def classify(source: Path, original: str, path: str, redirects: dict[str, str]) -> dict:
    existing = first_existing(path)
    if existing:
        exact = (ROOT / path.lstrip("/")).exists()
        status = "LOCAL_EXACT" if exact else "ROUTE_RESOLVED"
        return {
            "source": source.relative_to(ROOT).as_posix(),
            "href": original,
            "normalized_path": path,
            "classification": status,
            "resolved_to": existing.relative_to(ROOT).as_posix(),
            "redirect_chain": [],
            "http_status": None,
            "live_final": "",
        }

    chain, target = follow_redirect(path, redirects)
    if chain:
        redirected_existing = first_existing(target)
        if redirected_existing:
            return {
                "source": source.relative_to(ROOT).as_posix(),
                "href": original,
                "normalized_path": path,
                "classification": "REDIRECT_RESOLVED",
                "resolved_to": redirected_existing.relative_to(ROOT).as_posix(),
                "redirect_chain": chain + [target],
                "http_status": None,
                "live_final": "",
            }

    live_status, http_status, live_final = live_check(path)
    return {
        "source": source.relative_to(ROOT).as_posix(),
        "href": original,
        "normalized_path": path,
        "classification": live_status,
        "resolved_to": target if chain else "",
        "redirect_chain": chain + ([target] if chain else []),
        "http_status": http_status,
        "live_final": live_final,
    }


def main() -> None:
    redirects = parse_redirects()
    rows: list[dict] = []
    seen: set[tuple[str, str]] = set()

    for source in sorted(p for p in ARTICLES.glob("*.html") if p.name.lower() != "index.html"):
        raw = source.read_text(encoding="utf-8", errors="replace")
        for href in HREF_RE.findall(raw):
            normalized = normalize_href(source, href)
            if normalized is None:
                continue
            original, path = normalized
            key = (source.as_posix(), original)
            if key in seen:
                continue
            seen.add(key)
            result = classify(source, original, path, redirects)
            if result["classification"] in {"LIVE_404", "LIVE_ERROR", "LIVE_UNVERIFIED", "REDIRECT_RESOLVED", "ROUTE_RESOLVED"}:
                rows.append(result)
                if result["classification"].startswith("LIVE_"):
                    time.sleep(0.03)

    counts = Counter(r["classification"] for r in rows)
    actual_missing = [r for r in rows if r["classification"] == "LIVE_404"]
    needs_review = [r for r in rows if r["classification"] in {"LIVE_ERROR", "LIVE_UNVERIFIED"}]
    false_positives = [r for r in rows if r["classification"] in {"ROUTE_RESOLVED", "REDIRECT_RESOLVED", "LIVE_OK"}]
    affected_actual = sorted({r["source"] for r in actual_missing})

    summary = {
        "references_rechecked": len(rows),
        "false_positive_references": len(false_positives),
        "actual_404_references": len(actual_missing),
        "actual_404_articles": len(affected_actual),
        "unverified_or_error": len(needs_review),
        "classification_counts": dict(sorted(counts.items())),
    }
    payload = {
        "summary": summary,
        "actual_404": actual_missing,
        "false_positives": false_positives,
        "needs_review": needs_review,
        "all_rechecked": rows,
    }

    (OUT / "second-link-audit.json").write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")

    fields = ["source", "href", "normalized_path", "classification", "resolved_to", "redirect_chain", "http_status", "live_final"]
    with (OUT / "second-link-audit.csv").open("w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fields)
        writer.writeheader()
        for row in rows:
            out = row.copy()
            out["redirect_chain"] = json.dumps(out["redirect_chain"], ensure_ascii=False)
            writer.writerow(out)

    md = [
        "# Savingio 2차 링크 감사", "",
        f"- 재검사 참조: **{summary['references_rechecked']}개**",
        f"- 오탐/정상 경로: **{summary['false_positive_references']}개**",
        f"- 실제 404: **{summary['actual_404_references']}개** / 영향 글 **{summary['actual_404_articles']}개**",
        f"- 네트워크 오류·확인 보류: **{summary['unverified_or_error']}개**", "",
        "## 분류별 개수", "",
    ]
    for key, value in summary["classification_counts"].items():
        md.append(f"- {key}: **{value}개**")
    md.extend(["", "## 실제 404 목록", "", "| 원본 글 | 링크 | 정규화 경로 | HTTP |", "|---|---|---|---:|"])
    for row in actual_missing:
        md.append(f"| `{row['source']}` | `{row['href']}` | `{row['normalized_path']}` | {row['http_status'] or ''} |")
    md.extend(["", "## 확인 보류", "", "| 원본 글 | 링크 | 판정 | 상세 |", "|---|---|---|---|"])
    for row in needs_review:
        md.append(f"| `{row['source']}` | `{row['href']}` | {row['classification']} | `{row['live_final']}` |")
    (OUT / "second-link-audit.md").write_text("\n".join(md) + "\n", encoding="utf-8")

    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
