from __future__ import annotations

import json
from pathlib import Path

from normalize_calculator_pages import ROOT, CALC_DIR, REPORT, attr, template, text_content

MAPPING = {
    "benefit-scam-risk-check": "benefitScam",
    "car-insurance-renewal-check": "carInsuranceRenewal",
    "exchange-rate": "exchange",
    "hourly-to-monthly": "hourly",
    "hourly": "hourly",
    "traffic-fine-response-check": "trafficFine",
    "weekpay": "weekly",
}


def main() -> None:
    rows = []
    for slug, key in MAPPING.items():
        path = CALC_DIR / f"{slug}.html"
        if not path.exists():
            rows.append({"file": path.name, "status": "missing"})
            continue
        source = path.read_text(encoding="utf-8", errors="ignore")
        title = text_content(source, r"<h1[^>]*>(.*?)</h1>", slug.replace("-", " "))
        if not title or title == slug.replace("-", " "):
            title = attr(source, r"<title>(.*?)\s*(?:\||-)?\s*Savingio</title>", slug.replace("-", " "))
        description = attr(source, r'<meta[^>]+name=["\']description["\'][^>]+content=["\']([^"\']*)', f"{title}를 빠르고 쉽게 확인합니다.")
        canonical = attr(source, r'<link[^>]+rel=["\']canonical["\'][^>]+href=["\']([^"\']+)', f"https://savingio.com/calculators/{slug}.html")
        updated = template(title, description, canonical, key)
        updated = updated.replace(
            '<script src="/js/calculator-configs.js?v=20260801-calc-dna"></script>',
            '<script src="/js/calculator-configs.js?v=20260801-calc-dna"></script>\n<script src="/js/calculator-extra-configs.js?v=20260801-calc-dna"></script>',
        )
        path.write_text(updated, encoding="utf-8")
        rows.append({"file": path.name, "status": "normalized", "key": key})

    report = ROOT / "factory" / "QA" / "CALCULATOR_REMAINING_NORMALIZATION.json"
    payload = {"normalized": sum(row["status"] == "normalized" for row in rows), "files": rows}
    report.parent.mkdir(parents=True, exist_ok=True)
    report.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(payload, ensure_ascii=False))


if __name__ == "__main__":
    main()
