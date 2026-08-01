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

GENERIC_PATTERNS = {
    "generic-lead": r"단순한 요약보다 본인에게 적용되는 조건을 확인하고, 필요한 행동까지 바로 이어갈 수 있도록 구성했습니다",
    "generic-summary": r"대상과 적용 조건 확인합니다",
    "generic-faq": r"온라인으로만 확인해야 하나요\?",
}

ARTICLE_DNA_PATTERNS = {
    "breadcrumb": r"class=[\"'][^\"']*breadcrumb",
    "h1": r"<h1\b",
    "lead": r"class=[\"'][^\"']*lead",
    "editorial": r"작성[·ㆍ]?검수|구성[·ㆍ]?검수|class=[\"'][^\"']*editorial",
    "summary": r"5초\s*결론|5초\s*안내|핵심\s*요약|가장\s*궁금한\s*답",
    "situation": r"30초|내\s*상황|상황별|이 글이 필요한 순간",
    "toc": r"class=[\"'][^\"']*toc|>목차<",
    "table": r"<table\b",
    "checklist": r"class=[\"'][^\"']*checklist|체크리스트",
    "faq": r"FAQPage|class=[\"'][^\"']*faq|<details\b",
    "related": r"관련\s*글|문제\s*해결\s*사슬|함께\s*볼",
    "footer": r"<footer\b",
}

RAIL_LABEL_GROUPS = [
    ("지금 해야 할 행동", ["지금 해야 할 행동"]),
    ("계산기/점검도구", ["계산기/점검도구", "계산기·점검도구", "계산기"]),
    ("같은 카테고리 글", ["같은 카테고리 글"]),
    ("함께 볼 관련 글", ["함께 볼 관련 글"]),
    ("다음 단계/주의사항", ["다음 단계/주의사항", "다음 단계·주의사항", "다음 단계"]),
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
    patterns = [
        r'<link[^>]+rel=["\']canonical["\'][^>]+href=["\']([^"\']+)',
        r'<link[^>]+href=["\']([^"\']+)["\'][^>]+rel=["\']canonical["\']',
    ]
    for pattern in patterns:
        m = re.search(pattern, text, re.I)
        if m:
            return m.group(1)
    return ""


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
        candidates.extend([ROOT / f"{rel}.html", ROOT / rel / "index.html"])
    return any(p.exists() for p in candidates)


def html_files(directory: Path) -> list[Path]:
    return sorted(p for p in directory.glob("*.html") if p.name != "index.html") if directory.exists() else []


def visual_card_reasons(text: str) -> list[str]:
    reasons: list[str] = []
    css = "\n".join(re.findall(r"<style\b[^>]*>(.*?)</style>", text, re.I | re.S))
    suspicious = [
        ("rounded-card", r"(?:\.summary-grid|\.topic-card|\.related-card|\.content-card|\.info-card)[^{]*\{[^}]*(?:border-radius\s*:\s*(?:1[2-9]|[2-9]\d)px)"),
        ("shadow-card", r"(?:\.summary-grid|\.topic-card|\.related-card|\.content-card|\.info-card)[^{]*\{[^}]*box-shadow\s*:\s*(?!none)"),
        ("card-grid", r"(?:\.summary-grid|\.topic-grid|\.card-grid)[^{]*\{[^}]*display\s*:\s*grid"),
    ]
    for name, pattern in suspicious:
        if re.search(pattern, css, re.I | re.S):
            reasons.append(name)
    return reasons


def rail_section(text: str) -> str:
    # Keep opening and closing tags paired. The old mixed-tag pattern
    # stopped an aside at the first nested div and produced false errors.
    aside = re.search(r"<aside[^>]+class=[\"'][^\"']*(?:right-rail|right\b|sidebar)[^\"']*[\"'][^>]*>(.*?)</aside>", text, re.I | re.S)
    if aside:
        return aside.group(1)
    div = re.search(r"<div[^>]+class=[\"'][^\"']*(?:right-rail|right\b|sidebar)[^\"']*[\"'][^>]*>(.*?)</div>", text, re.I | re.S)
    return div.group(1) if div else ""

def scan_rail(text: str) -> tuple[list[str], bool]:
    area = rail_section(text)
    if not area:
        return [group[0] for group in RAIL_LABEL_GROUPS], False
    positions: list[int] = []
    missing: list[str] = []
    for canonical, variants in RAIL_LABEL_GROUPS:
        found = [area.find(label) for label in variants if area.find(label) >= 0]
        if not found:
            missing.append(canonical)
            positions.append(-1)
        else:
            positions.append(min(found))
    valid_positions = [p for p in positions if p >= 0]
    return missing, not missing and valid_positions == sorted(valid_positions)


def scan_article(path: Path) -> dict:
    text = read(path)
    body_text = visible_text(text)
    missing_dna = [name for name, pattern in ARTICLE_DNA_PATTERNS.items() if not re.search(pattern, text, re.I | re.S)]
    blue = [name for name, pattern in BLUE_PATTERNS.items() if re.search(pattern, text, re.I | re.S)]
    generic = [name for name, pattern in GENERIC_PATTERNS.items() if re.search(pattern, text, re.I | re.S)]
    rail_missing, rail_order_ok = scan_rail(text)
    explorer = {"data": EXPLORER_DATA in text, "js": EXPLORER_JS in text, "css": EXPLORER_CSS in text}
    canonical = extract_canonical(text)
    expected = "/" + path.relative_to(ROOT).as_posix()
    expected = expected.removesuffix(".html")
    canonical_problem = not canonical or urlparse(canonical).path.rstrip("/").removesuffix(".html") != expected
    return {
        "path": path.relative_to(ROOT).as_posix(),
        "h1": extract_h1(text),
        "visible_chars": len(body_text),
        "explorer": explorer,
        "explorer_missing": [k for k, value in explorer.items() if not value],
        "blue_reasons": blue,
        "card_reasons": visual_card_reasons(text),
        "generic_reasons": generic,
        "missing_dna": missing_dna,
        "right_rail_missing": rail_missing,
        "right_rail_order_ok": rail_order_ok,
        "canonical": canonical,
        "canonical_problem": canonical_problem,
        "figure_thumb": bool(re.search(r'<figure[^>]+class=["\'][^"\']*thumb', text, re.I)),
        "duplicate_h1_count": len(re.findall(r"<h1\b", text, re.I)),
        "duplicate_toc_count": len(re.findall(r"class=[\"'][^\"']*\btoc\b", text, re.I)),
        "duplicate_editorial_count": len(re.findall(r"작성[·ㆍ]?검수|구성[·ㆍ]?검수", text)),
    }


def scan_topic(path: Path) -> dict:
    text = read(path)
    rail_missing, rail_order_ok = scan_rail(text)
    return {
        "path": path.relative_to(ROOT).as_posix(),
        "h1": extract_h1(text),
        "blue_reasons": [name for name, p in BLUE_PATTERNS.items() if re.search(p, text, re.I | re.S)],
        "card_reasons": visual_card_reasons(text),
        "explorer_missing": [name for name, token in {"data": EXPLORER_DATA, "js": EXPLORER_JS, "css": EXPLORER_CSS}.items() if token not in text],
        "old_layout": not bool(re.search(r"right-rail|rail-section", text, re.I)),
        "right_rail_missing": rail_missing,
        "right_rail_order_ok": rail_order_ok,
    }


def scan_calculator(path: Path) -> dict:
    text = read(path)
    required = {
        "body_data_calculator": bool(re.search(r"<body[^>]+data-calculator=", text, re.I)),
        "sv2_shell": "sv2-shell" in text,
        "calculator_engine": "/js/calculator-engine.js" in text,
        "calculator_configs": "/js/calculator-configs.js" in text,
        "brain_data": EXPLORER_DATA in text,
        "brain_js": EXPLORER_JS in text,
        "brain_css": EXPLORER_CSS in text,
    }
    return {
        "path": path.relative_to(ROOT).as_posix(),
        "missing": [k for k, value in required.items() if not value],
        "template_match_score": sum(required.values()),
        "blue_reasons": [name for name, p in BLUE_PATTERNS.items() if re.search(p, text, re.I | re.S)],
        "card_reasons": visual_card_reasons(text),
    }


def collect_internal_links() -> list[dict]:
    sources: list[Path] = []
    for folder in [ARTICLE_DIR, TOPIC_DIR, CALC_DIR, ROOT / "categories"]:
        if folder.exists():
            sources.extend(folder.glob("*.html"))
    for fixed in [ROOT / "index.html", ROOT / "search.html", ARTICLE_DIR / "index.html", CALC_DIR / "index.html", ROOT / "data" / "savingio-brain-data.js", ROOT / "js" / "savingio-article-registry.js"]:
        if fixed.exists():
            sources.append(fixed)
    missing: list[dict] = []
    pattern = re.compile(r'(?:href|url)\s*[:=]\s*["\']([^"\']+)["\']', re.I)
    for source in sorted(set(sources)):
        for href in pattern.findall(read(source)):
            if href.startswith(("#", "mailto:", "tel:", "javascript:")):
                continue
            if href.startswith(("http://", "https://")):
                if href.startswith("https://savingio.com") and not local_target_exists(href):
                    missing.append({"source": source.relative_to(ROOT).as_posix(), "href": href})
                continue
            if href.startswith("/") and not local_target_exists(href):
                missing.append({"source": source.relative_to(ROOT).as_posix(), "href": href})
    deduped: list[dict] = []
    seen = set()
    for item in missing:
        key = (item["source"], item["href"])
        if key not in seen:
            seen.add(key)
            deduped.append(item)
    return deduped


def main() -> None:
    article_rows = [scan_article(path) for path in html_files(ARTICLE_DIR)]
    topic_rows = [scan_topic(path) for path in html_files(TOPIC_DIR)]
    calc_rows = [scan_calculator(path) for path in html_files(CALC_DIR)]
    missing_links = collect_internal_links()
    h1_counts = Counter(row["h1"] for row in article_rows if row["h1"])
    duplicate_h1_values = sorted(h1 for h1, count in h1_counts.items() if count > 1)

    article_problem_rows = [row for row in article_rows if row["explorer_missing"] or row["blue_reasons"] or row["card_reasons"] or row["generic_reasons"] or row["missing_dna"] or row["right_rail_missing"] or not row["right_rail_order_ok"] or row["canonical_problem"] or row["figure_thumb"] or row["duplicate_h1_count"] != 1 or row["duplicate_toc_count"] > 1 or row["duplicate_editorial_count"] > 2]
    topic_problem_rows = [row for row in topic_rows if row["blue_reasons"] or row["card_reasons"] or row["explorer_missing"] or row["old_layout"] or row["right_rail_missing"] or not row["right_rail_order_ok"]]
    calc_problem_rows = [row for row in calc_rows if row["missing"] or row["blue_reasons"]]

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

    payload = {"audit": "savingio-full-adsense-structural-audit", "summary": summary, "article_problems": article_problem_rows, "topic_problems": topic_problem_rows, "calculator_problems": calc_problem_rows, "missing_internal_links": missing_links, "duplicate_h1_values": duplicate_h1_values}
    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    (REPORT_DIR / "FULL_ADSENSE_STRUCTURE_AUDIT.json").write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    lines = ["# Savingio 전체 애드센스 구조 감사", "", "## 요약", ""]
    lines.extend(f"- {key}: **{value}**" for key, value in summary.items())
    lines += ["", "## Article 문제 페이지", "", "| 파일 | Explorer | 파란 UI | 카드 UI | DNA 누락 | 우측 5영역 | canonical |", "|---|---|---|---|---|---|---|"]
    for row in article_problem_rows:
        rail = ", ".join(row["right_rail_missing"]) or ("순서 오류" if not row["right_rail_order_ok"] else "-")
        lines.append(f"| `{row['path']}` | {', '.join(row['explorer_missing']) or '-'} | {', '.join(row['blue_reasons']) or '-'} | {', '.join(row['card_reasons']) or '-'} | {', '.join(row['missing_dna']) or '-'} | {rail} | {'오류' if row['canonical_problem'] else '-'} |")
    lines += ["", "## Topic 문제 페이지", "", "| 파일 | Explorer | 파란 UI | 카드 UI | 구형 레이아웃/우측영역 |", "|---|---|---|---|---|"]
    for row in topic_problem_rows:
        rail = ", ".join(row["right_rail_missing"]) or ("순서 오류" if not row["right_rail_order_ok"] else "-")
        old = "구형" if row["old_layout"] else rail
        lines.append(f"| `{row['path']}` | {', '.join(row['explorer_missing']) or '-'} | {', '.join(row['blue_reasons']) or '-'} | {', '.join(row['card_reasons']) or '-'} | {old} |")
    lines += ["", "## Calculator 문제 페이지", "", "| 파일 | 현재 기본틀 누락 | 점수 | 파란 UI |", "|---|---|---:|---|"]
    for row in calc_problem_rows:
        lines.append(f"| `{row['path']}` | {', '.join(row['missing']) or '-'} | {row['template_match_score']}/7 | {', '.join(row['blue_reasons']) or '-'} |")
    lines += ["", "## 존재하지 않는 내부 링크", "", "| 원본 | 링크 |", "|---|---|"]
    lines.extend(f"| `{item['source']}` | `{item['href']}` |" for item in missing_links)
    lines += ["", "## 중복 H1", ""]
    lines.extend(f"- {value}" for value in duplicate_h1_values)
    lines.append("")
    (REPORT_DIR / "FULL_ADSENSE_STRUCTURE_AUDIT.md").write_text("\n".join(lines), encoding="utf-8")
    print(json.dumps(summary, ensure_ascii=False))


if __name__ == "__main__":
    main()
