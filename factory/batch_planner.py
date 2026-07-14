from __future__ import annotations

from collections import defaultdict
from pathlib import Path

from qa import audit_html
from utils import ROOT, read_text, save_json

CATEGORY_RULES = {
    "생활비": ["electric", "aircon", "water", "gas", "management-fee", "phone", "telecom", "internet", "subscription"],
    "세금·환급": ["tax", "vat", "refund", "property-tax", "hometax", "wetax"],
    "정부지원": ["benefit", "support", "voucher", "allowance", "welfare"],
    "급여·근로": ["salary", "severance", "weekly", "unemployment", "leave"],
    "금융·신용": ["bank", "credit", "loan", "deposit", "card"],
    "자동차·교통": ["car-", "vehicle", "traffic", "fuel"],
}


def category_for(name: str) -> str:
    lower = name.lower()
    for category, keys in CATEGORY_RULES.items():
        if any(k in lower for k in keys):
            return category
    return "기타"


def build_backlog() -> dict:
    groups: dict[str, list[dict]] = defaultdict(list)
    for path in sorted((ROOT / "articles").glob("*.html")):
        qa = audit_html(read_text(path), source=path)
        groups[category_for(path.name)].append({"file": str(path.relative_to(ROOT)), "score": qa["score"], "status": qa["status"], "blockers": qa["blockers"]})
    for items in groups.values():
        items.sort(key=lambda x: (x["score"], x["file"]))
    payload = {"priority_order": ["생활비", "세금·환급", "정부지원", "급여·근로", "금융·신용", "자동차·교통", "기타"], "categories": groups}
    save_json(ROOT / "factory-output" / "renewal-backlog.json", payload)
    return payload
