from __future__ import annotations

import html
import json
import re
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
AUDIT = ROOT / "factory" / "FULL_ARTICLE_AUDIT" / "full-article-audit.json"
OUT = ROOT / "factory" / "DUPLICATE_CONTENT_REVIEW"
OUT.mkdir(parents=True, exist_ok=True)
TOKEN_RE = re.compile(r"[가-힣A-Za-z0-9]{2,}")
STOP = {"savingio", "세이빙이오", "방법", "가이드", "확인", "정리", "2026"}


def tokens(text: str) -> set[str]:
    return {x.lower() for x in TOKEN_RE.findall(html.unescape(text or "")) if x.lower() not in STOP}


def jaccard(a: set[str], b: set[str]) -> float:
    return len(a & b) / len(a | b) if a or b else 0.0


def main() -> None:
    data = json.loads(AUDIT.read_text(encoding="utf-8"))
    rows = {r["path"]: r for r in data["articles"]}
    pairs = data.get("duplicate_pairs", [])

    graph: dict[str, set[str]] = defaultdict(set)
    for p in pairs:
        graph[p["a"]].add(p["b"])
        graph[p["b"]].add(p["a"])

    seen: set[str] = set()
    clusters: list[list[str]] = []
    for node in sorted(graph):
        if node in seen:
            continue
        stack = [node]
        cluster: list[str] = []
        while stack:
            cur = stack.pop()
            if cur in seen:
                continue
            seen.add(cur)
            cluster.append(cur)
            stack.extend(graph[cur] - seen)
        clusters.append(sorted(cluster))

    decisions = []
    for p in sorted(pairs, key=lambda x: x["score"], reverse=True):
        a, b = rows[p["a"]], rows[p["b"]]
        ta, tb = tokens(a.get("h1") or a.get("title", "")), tokens(b.get("h1") or b.get("title", ""))
        title_overlap = round(jaccard(ta, tb), 4)
        score = float(p["score"])
        if score >= 0.88 and title_overlap >= 0.55:
            decision = "MERGE_CANDIDATE"
            keep = a["path"] if a["char_count"] >= b["char_count"] else b["path"]
            retire = b["path"] if keep == a["path"] else a["path"]
            reason = "본문과 검색 의도가 모두 매우 유사함"
        elif score >= 0.80 and title_overlap >= 0.40:
            decision = "MANUAL_REVIEW"
            keep = ""
            retire = ""
            reason = "본문 유사도가 높지만 검색 의도 분리 가능성 있음"
        else:
            decision = "KEEP_BOTH"
            keep = ""
            retire = ""
            reason = "공통 템플릿 영향 가능성이 높고 제목 검색 의도가 구분됨"
        decisions.append({
            "a": a["path"], "b": b["path"], "body_score": score,
            "title_overlap": title_overlap, "decision": decision,
            "recommended_keep": keep, "recommended_retire": retire, "reason": reason,
        })

    summary = {
        "suspected_articles": len(graph),
        "pairs": len(pairs),
        "clusters": len(clusters),
        "merge_candidates": sum(d["decision"] == "MERGE_CANDIDATE" for d in decisions),
        "manual_review": sum(d["decision"] == "MANUAL_REVIEW" for d in decisions),
        "keep_both": sum(d["decision"] == "KEEP_BOTH" for d in decisions),
        "note": "자동 삭제는 하지 않으며 검색 의도와 URL 가치 확인 후 확정한다.",
    }
    payload = {"summary": summary, "clusters": clusters, "decisions": decisions}
    (OUT / "duplicate-content-review.json").write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")

    md = [
        "# Savingio 중복 콘텐츠 정밀 판정", "",
        f"- 중복 의심 글: **{summary['suspected_articles']}개**",
        f"- 중복 쌍: **{summary['pairs']}개**",
        f"- 연결 군집: **{summary['clusters']}개**",
        f"- 통합 후보: **{summary['merge_candidates']}쌍**",
        f"- 수동 확인: **{summary['manual_review']}쌍**",
        f"- 각각 유지: **{summary['keep_both']}쌍**", "",
        "> 이 보고서는 공통 템플릿 때문에 생긴 오탐을 분리합니다. 자동 삭제는 하지 않습니다.", "",
        "| 판정 | A | B | 본문 유사도 | 제목 겹침 | 유지 권고 | 정리 권고 | 이유 |",
        "|---|---|---|---:|---:|---|---|---|",
    ]
    for d in decisions:
        md.append(f"| {d['decision']} | `{d['a']}` | `{d['b']}` | {d['body_score']:.4f} | {d['title_overlap']:.4f} | `{d['recommended_keep']}` | `{d['recommended_retire']}` | {d['reason']} |")
    (OUT / "duplicate-content-review.md").write_text("\n".join(md) + "\n", encoding="utf-8")
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
