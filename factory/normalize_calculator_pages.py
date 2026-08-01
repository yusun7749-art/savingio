from __future__ import annotations

import html
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CALC_DIR = ROOT / "calculators"
CONFIGS = ROOT / "js" / "calculator-configs.js"
REPORT = ROOT / "factory" / "QA" / "CALCULATOR_DNA_NORMALIZATION.json"

ALIASES = {
    "salary-net-pay": "salary",
    "salary": "salary",
    "severance-pay": "severance",
    "severance": "severance",
    "weekly-pay": "weekly",
    "weekly": "weekly",
    "annual-leave": "leave",
    "leave": "leave",
    "loan-payment": "loan",
    "loan": "loan",
    "percentage": "percentage",
    "hourly-to-monthly": "hourly",
    "electricity-cost": "electricity",
    "water-cost": "water",
    "gas-cost": "gas",
    "car-tax": "carTax",
    "acquisition-tax": "acquisitionTax",
    "property-tax": "propertyTax",
    "vat": "vat",
    "income-tax": "incomeTax",
    "freelancer-tax": "freelancerTax",
    "deposit-interest": "depositInterest",
    "savings-interest": "savingsInterest",
    "compound-interest": "compoundInterest",
    "discount-rate": "discountRate",
    "unit-price": "unitPrice",
    "fuel-cost": "fuelCost",
    "rent-conversion": "rentConversion",
    "dti": "dti",
    "dsr": "dsr",
}


def text_content(source: str, pattern: str, default: str) -> str:
    match = re.search(pattern, source, re.I | re.S)
    if not match:
        return default
    return re.sub(r"<[^>]+>", " ", match.group(1)).strip() or default


def attr(source: str, pattern: str, default: str) -> str:
    match = re.search(pattern, source, re.I | re.S)
    return match.group(1).strip() if match else default


def config_keys() -> set[str]:
    source = CONFIGS.read_text(encoding="utf-8", errors="ignore")
    keys = set(re.findall(r"(?:^|\n)\s{4}([A-Za-z_$][\w$]*)\s*:\s*\{\s*title\s*:", source))
    keys.update(re.findall(r"(?:^|\n)\s{4}['\"]([^'\"]+)['\"]\s*:\s*\{\s*title\s*:", source))
    return keys


def infer_key(slug: str, source: str, keys: set[str]) -> str | None:
    current = attr(source, r'<body[^>]+data-calculator=["\']([^"\']+)', "")
    candidates = [current, ALIASES.get(slug, ""), slug, slug.replace("-", ""), slug.replace("-", "_")]
    for candidate in candidates:
        if candidate and candidate in keys:
            return candidate
    return None


def template(title: str, description: str, canonical: str, key: str) -> str:
    e_title = html.escape(title)
    e_desc = html.escape(description)
    e_canonical = html.escape(canonical, quote=True)
    e_key = html.escape(key, quote=True)
    return f'''<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{e_title} | Savingio</title>
<meta name="description" content="{e_desc}">
<meta name="robots" content="index,follow">
<link rel="canonical" href="{e_canonical}">
<link rel="icon" href="/images/logo.svg" type="image/svg+xml">
<link rel="stylesheet" href="/css/style.css?v=20260801-calc-dna">
<link rel="stylesheet" href="/css/calculator-v2.css?v=20260801-calc-dna">
<link rel="stylesheet" href="/css/calculator-brand-v3.css?v=20260801-calc-dna">
<link rel="stylesheet" href="/css/calculator-master-v2.css?v=center-lock2">
<link rel="stylesheet" href="/css/savingio-brain-navigation.css?v=17">
</head>
<body class="sv2-body savingio-main-background savingio-calculator-page" data-calculator="{e_key}">
<header class="site-header"><div class="header-inner"><a class="logo" href="/">Savingio</a><nav class="nav"><a href="/">홈</a><a href="/articles/">전체 글</a><a href="/categories/">카테고리</a><a href="/calculators/">계산기</a><a href="/about.html">소개</a><a href="/contact.html">문의</a></nav></div></header>
<main class="sv2-shell">
<section class="sv2-hero"><span class="sv2-kicker">사용자는 사실만 입력하세요</span><h1 id="calc-title">{e_title}</h1><p id="calc-description">{e_desc}</p></section>
<section class="sv2-card">
<div class="sv2-step"><span>1</span>내가 아는 값 입력</div>
<form id="calc-form"><div class="sv2-grid" id="calc-fields"></div><details class="sv2-details" id="calc-details"></details><div class="sv2-actions"><button class="sv2-btn primary" id="calc-submit" type="submit">계산하기</button><button class="sv2-btn secondary" id="calc-reset" type="button">초기화</button></div><div id="sv2-error" class="sv2-error"></div></form>
<section id="sv2-result" class="sv2-result" aria-live="polite"><div class="sv2-step"><span>2</span>예상 결과</div><div class="sv2-result-main"><small id="sv2-main-label"></small><strong id="sv2-main-value"></strong><span id="sv2-badge" class="sv2-badge"></span></div><div id="sv2-breakdown" class="sv2-breakdown"></div><div id="sv2-explain" class="sv2-explain"></div><div class="sv2-notice" id="calc-notice"></div><div class="sv2-official" id="calc-official"></div><div class="sv2-links" id="calc-links"></div></section>
</section>
</main>
<footer class="site-footer"><div class="footer-inner"><strong>Savingio</strong><div>생활 속 돈 문제를 빠르고 쉽게 계산하는 정보 서비스입니다.</div><div><a href="/about.html">소개</a> · <a href="/privacy.html">개인정보처리방침</a> · <a href="/contact.html">문의</a></div></div></footer>
<script src="/js/calculator-configs.js?v=20260801-calc-dna"></script>
<script src="/js/calculator-engine.js?v=center-lock2"></script>
<script src="/data/savingio-brain-data.js?v=20260801-full-repair"></script>
<script src="/js/savingio-brain-navigation.js?v=17"></script>
</body>
</html>
'''


def main() -> None:
    keys = config_keys()
    rows = []
    for path in sorted(CALC_DIR.glob("*.html")):
        if path.name == "index.html":
            continue
        source = path.read_text(encoding="utf-8", errors="ignore")
        slug = path.stem
        key = infer_key(slug, source, keys)
        if not key:
            rows.append({"file": path.name, "status": "skipped_no_config"})
            continue
        title = text_content(source, r"<h1[^>]*>(.*?)</h1>", slug.replace("-", " "))
        if not title or title == slug.replace("-", " "):
            title = attr(source, r"<title>(.*?)\s*(?:\||-)?\s*Savingio</title>", slug.replace("-", " "))
        description = attr(source, r'<meta[^>]+name=["\']description["\'][^>]+content=["\']([^"\']*)', f"{title}를 빠르고 쉽게 계산합니다.")
        canonical = attr(source, r'<link[^>]+rel=["\']canonical["\'][^>]+href=["\']([^"\']+)', f"https://savingio.com/calculators/{slug}.html")
        updated = template(title, description, canonical, key)
        if updated == source:
            rows.append({"file": path.name, "status": "unchanged", "key": key})
            continue
        path.write_text(updated, encoding="utf-8")
        rows.append({"file": path.name, "status": "normalized", "key": key})

    payload = {
        "config_keys": sorted(keys),
        "normalized": sum(row["status"] == "normalized" for row in rows),
        "unchanged": sum(row["status"] == "unchanged" for row in rows),
        "skipped": sum(row["status"].startswith("skipped") for row in rows),
        "files": rows,
    }
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    REPORT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({key: payload[key] for key in ("normalized", "unchanged", "skipped")}, ensure_ascii=False))


if __name__ == "__main__":
    main()
