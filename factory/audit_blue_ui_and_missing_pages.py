from __future__ import annotations

import json
import re
from collections import Counter
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
REPORT_DIR = ROOT / "factory" / "QA"
ARTICLE_DIR = ROOT / "articles"
TOPIC_DIR = ROOT / "topics"
CALC_DIR = ROOT / "calculators"

BLUE_PATTERNS = {
    "blue-hex": r"#(?:1769ff|1457c9|0d6efd|2563eb|1d4ed8|3b82f6|60a5fa|dce8ff|eef4ff)",
    "blue-rgb": r"rgb\s*\(\s*(?:23\s*,\s*105\s*,\s*255|20\s*,\s*87\s*,\s*201|37\s*,\s*99\s*,\s*235)\s*\)",
    "old-blue-gradient": r"linear-gradient\([^)]*(?:#eef4ff|#dce8ff|#1769ff|#1457c9)",
    "blue-brand-var": r"--(?:brand|primary|accent)\s*:\s*#(?:1769ff|1457c9|0d6efd|2563eb|1d4ed8)",
}

CARD_PATTERNS = {
    "summary-grid": r"\bsummary-grid\b",
    "topic-card": r"\btopic-card\b",
    "related-card": r"\brelated-card\b",
    "hero-actions": r"\bhero-actions\b",
    "card-grid": r"\bcard-grid\b",
    "content-card": r"\bcontent-card\b",
    "info-card": r"\binfo-card\b",
    "three-second-summary": r"3초\s*요약",
}

GENERIC_PATTERNS = {
    "generic-lead": r"단순한 요약보다 본인에게 적용되는 조건을 확인하고, 필요한 행동까지 바로 이어갈 수 있도록 구성했습니다",
    "generic-summary": r"대상과 적용 조건 확인합니다",
    "generic-faq": r"온라인으로만 확인해야 하나요\?",
}

ARTICLE_DNA_PATTERNS = {
    "breadcrumb": r"class=[\"'][^\"']*breadcrumb",
    "h1": r"<h1\b",
    "lead": r"class=[\"'][^\"']*lead",
    "editorial": r"작성[·ㆍ]?검수|class=[\"'][^\"']*editorial",
    "summary": r"5초\s*결론|핵심\s*요약",
    "situation": r"30초|내\s*상황",
    "toc": r"class=[\"'][^\"']*toc|>목차<",
    "table": r"<table\b",
    "checklist": r"class=[\"'][^\"']*checklist|체크리스트",
    "faq": r"FAQPage|class=[\"'][^\"']*faq|<details\b",
    "related": r"관련\s*글|문제\s*해결\s*사슬",
    "footer": r"<footer\b",
}

RIGHT_RAIL_LABELS = [
    "지금 해야 할 행동",
    "계산기",
    "같은 카테고리 글",
    "함께 볼 관련 글",
    "다음 단계",
]

EXPLORER_DATA = "/data/savingio-brain-data.js"
EXPLORER_JS = "/js/savingio-brain-navigation.js"
EXPLORER_CSS = "/css/savingio-brain-navigation.css"


def read(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="ignore")


def visible_text(text: str) -> str:
    text = re.sub(r"<style\b[^>]*>.*?</style>", "", text, flags=re.I | re.S)
    text = re.sub(r"<script\b[^>]*>.*?</script>", "", text, flags=re.I | re.S)
    text = re.sub(r"<[^>]+>", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def extract_h1(text: str) -> str:
    m = re.search(r"<h1[^>]*>(.*?)</h1>", text, re.I | re.S)
    return re.sub(r"<[^>]+>", "", m.group(1)).strip() if m else ""


def extract_canonical(text: str) -> str:
    m = re.search(r'<link[^>]+rel=["\']canonical["\'][^>]+href=["\']([^"\']+)', text, re.I)
    if not m:
        m = re.search(r'<link[^>]+href=["\']([^"\']+)["\'][^>]+rel=["\']canonical["\']', text, re.I)
    return m.group(1) if m else ""


def local_target_exists(href: str) -> bool:
    parsed = urlparse(href)
    path = parsed.path
    if not path.startswith("/"):
        return True
    rel = path.lstrip("/")
    candidates = [ROOT / rel]
    if path.endswith("/"):
        candidates.append(ROOT / rel / "index.html")
    else:
        candidates.append(ROOT / f"{rel}.html")
        candidates.append(ROOT / rel / "index.html")
    return any(p.exists() for p in candidates)


def html_files(directory: Path) -> list[Path]:
    if not directory.exists():
        return []
    return sorted(p for p in directory.glob("*.html") if p.name != "index.html")


def scan_article(path: Path) -> dict:
    text = read(path)
    body_text = visible_text(text)
    missing_dna = [name for name, pattern in ARTICLE_DNA_PATTERNS.items() if not re.search(pattern, text, re.I | re.S)]
    blue = [name for name, pattern in BLUE_PATTERNS.items() if re.search(pattern, text, re.I | re.S)]
    cards = [name for name, pattern in CARD_PATTERNS.items() if re.search(pattern, text, re.I | re.S)]
    generic = [name for name, pattern in GENERIC_PATTERNS.items() if re.search(pattern, text, re.I | re.S)]
    rail_positions = [text.find(label) for label in RIGHT_RAIL_LABELS]
    rail_missing = [label for label, pos in zip(RIGHT_RAIL_LABELS, rail_positions) if pos < 0]
    rail_order_ok = not rail_missing and rail_positions == sorted(rail_positions)
    explorer = {
        "data": EXPLORER_DATA in text,
        "js": EXPLORER_JS in text,
        "css": EXPLORER_CSS in text,
    }
    canonical = extract_canonical(text)
    canonical_problem = False
    if canonical:
        cpath = urlparse(canonical).path.rstrip("/")
        expected = "/" + path.relative_to(ROOT).as_posix()
        expected = expected.removesuffix(".html")
        canonical_problem = cpath.removesuffix(".html") != expected
    else:
        canonical_problem = True
    return {
        "path": path.relative_to(ROOT).as_posix(),
        "h1": extract_h1(text),
        "visible_chars": len(body_text),
        "explorer": explorer,
        "explorer_missing": [k for k, value in explorer.items() if not value],
        "blue_reasons": blue,
        "card_reasons": cards,
        "generic_reasons": generic,
        "missing_dna": missing_dna,
        "right_rail_missing": rail_missing,
        "right_rail_order_ok": rail_order_ok,
        "canonical": canonical,
        "canonical_problem": canonical_problem,
        "figure_thumb": bool(re.search(r'<figure[^>]+class=["\'][^"\']*thumb', text, re.I)),
        "duplicate_h1_count": len(re.findall(r"<h1\b", text, re.I)),
        "duplicate_toc_count": len(re.findall(r"class=[\"'][^\"']*\btoc\b", text, re.I)),
        "duplicate_editorial_count": len(re.findall(r"작성[·ㆍ]?검수", text)),
    }


def scan_topic(path: Path) -> dict:
    text = read(path)
    return {
        "path": path.relative_to(ROOT).as_posix(),
        "h1": extract_h1(text),
        "blue_reasons": [name for name, p in BLUE_PATTERNS.items() if re.search(p, text, re.I | re.S)],
        "card_reasons": [name for name, p in CARD_PATTERNS.items() if re.search(p, text, re.I | re.S)],
        "explorer_missing": [
            name for name, token in {"data": EXPLORER_DATA, "js": EXPLORER_JS, "css": EXPLORER_CSS}.items() if token not in text
        ],
        "old_layout": not bool(re.search(r"right-rail|rail-section", text, re.I)),
    }


def scan_calculator(path: Path, salary_text: str) -> dict:
    text = read(path)
    required = {
        "master_css": "/css/calculator-master-v1.css" in text,
        "left_explorer": EXPLORER_JS in text or "calculator-explorer" in text,
        "center_layout": bool(re.search(r"calculator-shell|calculator-layout|calc-shell", text, re.I)),
        "right_directory": bool(re.search(r"right-rail|calculator-directory|all-calculators", text, re.I)),
    }
    salary_tokens = ["calculator-master-v1.css", "calculator-shell", "calculator-engine.js"]
    template_match = sum(token in text for token in salary_tokens)
    return {
        "path": path.relative_to(ROOT).as_posix(),
        "missing": [k for k, value in required.items() if not value],
        "template_match_score": template_match,
        "blue_reasons": [name for name, p in BLUE_PATTERNS.items() if re.search(p, text, re.I | re.S)],
        "card_reasons": [name for name, p in CARD_PATTERNS.items() if re.search(p, text, re.I | re.S)],
    }


def collect_internal_links() -> list[dict]:
    sources = []
    for folder in [ARTICLE_DIR, TOPIC_DIR, CALC_DIR, ROOT / "categories"]:
        if folder.exists():
            sources.extend(folder.glob("*.html"))
    for fixed in [ROOT / "index.html", ROOT / "search.html", ARTICLE_DIR / "index.html", CALC_DIR / "index.html", ROOT / "data" / "savingio-brain-data.js", ROOT / "js" / "savingio-article-registry.js"]:
        if fixed.exists():
            sources.append(fixed)
    missing = []
    pattern = re.compile(r'(?:href|url)\s*[:=]\s*["\']([^"\']+)["\']', re.I)
    for source in sorted(set(sources)):
        text = read(source)
        for href in pattern.findall(text):
            if href.startswith(("#", "mailto:", "tel:", "javascript:", "http://", "https://")):
                if href.startswith("https://savingio.com") and not local_target_exists(href):
                    missing.append({"source": source.relative_to(ROOT).as_posix(), "href": href})
                continue
            if href.startswith("/") and not local_target_exists(href):
                missing.append({"source": source.relative_to(ROOT).as_posix(), "href": href})
    deduped = []
    seen = set()
    for item in missing:
        key = (item["source"], item["href"])
        if key not in seen:
            seen.add(key)
            deduped.append(item)
    return deduped


def main() -> None:
    articles = html_files(ARTICLE_DIR)
    article_rows = [scan_article(path) for path in articles]
    topics = html_files(TOPIC_DIR)
    topic_rows = [scan_topic(path) for path in topics]
    salary_path = CALC_DIR / "salary.html"
    salary_text = read(salary_path) if salary_path.exists() else ""
    calculators = html_files(CALC_DIR)
    calc_rows = [scan_calculator(path, salary_text) for path in calculators]
    missing_links = collect_internal_links()

    h1_counts = Counter(row["h1"] for row in article_rows if row["h1"])
    duplicate_h1_values = sorted(h1 for h1, count in h1_counts.items() if count > 1)

    article_problem_rows = [
        row for row in article_rows
        if row["explorer_missing"] or row["blue_reasons"] or row["card_reasons"] or row["generic_reasons"]
        or row["missing_dna"] or row["right_rail_missing"] or not row["right_rail_order_ok"]
        or row["canonical_problem"] or row["figure_thumb"] or row["duplicate_h1_count"] != 1
        or row["duplicate_toc_count"] > 1 or row["duplicate_editorial_count"] > 2
    ]
    topic_problem_rows = [row for row in topic_rows if row["blue_reasons"] or row["card_reasons"] or row["explorer_missing"] or row["old_layout"]]
    calc_problem_rows = [row for row in calc_rows if row["missing"] or row["template_match_score"] < 2 or row["blue_reasons"]]

    summary = {
        "articles_scanned": len(article_rows),
        "article_problem_pages": len(article_problem_rows),
        "explorer_missing_pages": sum(bool(row["explorer_missing"]) for row in article_rows),
        "blue_ui_pages": sum(bool(row["blue_reasons"]) for row in article_rows),
        "card_ui_pages": sum(bool(row["card_reasons"]) for row in article_rows),
        "generic_template_pages": sum(bool(row["generic_reasons"]) for row in article_rows),
        "article_dna_problem_pages": sum(bool(row["missing_dna"]) for row in article_rows),
        "right_rail_problem_pages": sum(bool(row["right_rail_missing"]) or not row["right_rail_order_ok"] for row in article_rows),
        "canonical_problem_pages": sum(row["canonical_problem"] for row in article_rows),
        "figure_thumb_pages": sum(row["figure_thumb"] for row in article_rows),
        "duplicate_h1_values": len(duplicate_h1_values),
        "topics_scanned": len(topic_rows),
        "topic_problem_pages": len(topic_problem_rows),
        "calculators_scanned": len(calc_rows),
        "calculator_problem_pages": len(calc_problem_rows),
        "missing_internal_links": len(missing_links),
    }

    payload = {
        "audit": "savingio-full-adsense-structural-audit",
        "summary": summary,
        "article_problems": article_problem_rows,
        "topic_problems": topic_problem_rows,
        "calculator_problems": calc_problem_rows,
        "missing_internal_links": missing_links,
        "duplicate_h1_values": duplicate_h1_values,
    }
    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    json_path = REPORT_DIR / "FULL_ADSENSE_STRUCTURE_AUDIT.json"
    md_path = REPORT_DIR / "FULL_ADSENSE_STRUCTURE_AUDIT.md"
    json_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    lines = [
        "# Savingio 전체 애드센스 구조 감사",
        "",
        "## 요약",
        "",
    ]
    for key, value in summary.items():
        lines.append(f"- {key}: **{value}**")
    lines += ["", "## Article 문제 페이지", "", "| 파일 | Explorer | 파란 UI | 카드 UI | DNA 누락 | 우측 5영역 | canonical |", "|---|---|---|---|---|---|---|"]
    for row in article_problem_rows:
        lines.append(
            f"| `{row['path']}` | {', '.join(row['explorer_missing']) or '-'} | {', '.join(row['blue_reasons']) or '-'} | "
            f"{', '.join(row['card_reasons']) or '-'} | {', '.join(row['missing_dna']) or '-'} | "
            f"{', '.join(row['right_rail_missing']) or ('순서 오류' if not row['right_rail_order_ok'] else '-')} | "
            f"{'오류' if row['canonical_problem'] else '-'} |"
        )
    lines += ["", "## Topic 문제 페이지", "", "| 파일 | Explorer | 파란 UI | 카드 UI | 구형 레이아웃 |", "|---|---|---|---|---|"]
    for row in topic_problem_rows:
        lines.append(f"| `{row['path']}` | {', '.join(row['explorer_missing']) or '-'} | {', '.join(row['blue_reasons']) or '-'} | {', '.join(row['card_reasons']) or '-'} | {'예' if row['old_layout'] else '-'} |")
    lines += ["", "## Calculator 문제 페이지", "", "| 파일 | 기본틀 누락 | salary 기준 점수 | 파란 UI |", "|---|---|---:|---|"]
    for row in calc_problem_rows:
        lines.append(f"| `{row['path']}` | {', '.join(row['missing']) or '-'} | {row['template_match_score']}/3 | {', '.join(row['blue_reasons']) or '-'} |")
    lines += ["", "## 존재하지 않는 내부 링크", "", "| 원본 | 링크 |", "|---|---|"]
    for item in missing_links:
        lines.append(f"| `{item['source']}` | `{item['href']}` |")
    lines += ["", "## 중복 H1", ""]
    for value in duplicate_h1_values:
        lines.append(f"- {value}")
    lines.append("")
    md_path.write_text("\n".join(lines), encoding="utf-8")
    print(json.dumps(summary, ensure_ascii=False))


if __name__ == "__main__":
    main()
