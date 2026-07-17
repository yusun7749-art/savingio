from __future__ import annotations

import argparse
import html as html_lib
import json
import re
from pathlib import Path

BATCH_01 = [
    "apartment-management-fee-summer.html", "장기수선충당금-소유자-부담과-임차인-반환-확인-107af18f.html",
    "apartment-leak-emergency-response.html", "daily-liability-leak-insurance.html", "home-water-leak-self-check.html",
    "water-bill-saving.html", "summer-water-bill-spike-check.html", "water-bill-guide.html",
    "deposit-return-guarantee-checklist.html", "monthly-rent-tax-credit-documents.html", "rental-contract-reporting-guide.html",
    "fixed-date-online-application.html", "heating-bill-saving.html", "gas-bill-checklist.html",
    "electricity-bill-saving.html", "electricity-bill-easy-calculator-guide.html", "summer-electricity-tier-check-2026.html",
    "building-land-property-tax.html", "property-tax-july-september-difference.html", "youth-housing-benefit-separate-payment.html",
]

PATHS = {
    "leak": [("아랫집에서 누수 연락이 왔어요", "/articles/apartment-leak-emergency-response.html", "지금 잠그고 기록할 것부터 확인"), ("일배책으로 누수 보험 처리", "/articles/daily-liability-leak-insurance.html", "접수 순서와 준비 자료 확인"), ("우리 집 누수인지 확인", "/articles/home-water-leak-self-check.html", "계량기와 사용처를 차례로 점검"), ("수도요금이 갑자기 늘었어요", "/articles/summer-water-bill-spike-check.html", "사용량 급증과 누수를 구분")],
    "rent": [("전세보증금 반환보증", "/articles/deposit-return-guarantee-checklist.html", "가입 전에 조건과 서류 확인"), ("확정일자 온라인 신청", "/articles/fixed-date-online-application.html", "전입 후 놓치기 쉬운 순서 확인"), ("전월세 신고", "/articles/rental-contract-reporting-guide.html", "대상·기한·준비서류 확인"), ("월세 세액공제", "/articles/monthly-rent-tax-credit-documents.html", "연말정산 전에 증빙 준비")],
    "bill": [("아파트 관리비 점검", "/articles/apartment-management-fee-summer.html", "고지서에서 먼저 볼 항목"), ("장기충당금 돌려받기", "/articles/장기수선충당금-소유자-부담과-임차인-반환-확인-107af18f.html", "소유자 부담과 임차인 반환 확인"), ("수도요금 절약", "/articles/water-bill-saving.html", "누수와 사용량부터 구분"), ("난방비 절약", "/articles/heating-bill-saving.html", "보일러 설정과 고지서 점검")],
    "tax": [("주택 재산세 7월·9월", "/articles/property-tax-july-september-difference.html", "두 번 고지되는 이유 확인"), ("건축물·토지 재산세", "/articles/building-land-property-tax.html", "과세 대상 차이 확인"), ("전월세 신고", "/articles/rental-contract-reporting-guide.html", "계약 뒤 신고 순서 확인"), ("청년 주거급여", "/articles/youth-housing-benefit-separate-payment.html", "분리지급 조건 확인")],
}

def title_of(doc: str) -> str:
    match = re.search(r"<h1\b[^>]*>(.*?)</h1>", doc, re.I | re.S) or re.search(r"<title>(.*?)</title>", doc, re.I | re.S)
    raw = re.sub(r"<[^>]+>", "", match.group(1) if match else "생활 문제 해결")
    return html_lib.unescape(raw).split(" | ")[0].strip()

def group_for(name: str, title: str) -> str:
    text = name + title
    if any(word in text for word in ("누수", "수도")): return "leak"
    if any(word in text for word in ("전세", "월세", "임대", "확정일자", "주거급여")): return "rent"
    if any(word in text for word in ("재산세", "건축물", "토지")): return "tax"
    return "bill"

def add_body_classes(doc: str) -> str:
    match = re.search(r"<body\b([^>]*)>", doc, re.I)
    if not match: raise ValueError("body tag missing")
    attrs = match.group(1)
    cm = re.search(r'class\s*=\s*(["\'])(.*?)\1', attrs, re.I | re.S)
    wanted = ["factory-remodel-v1", "savingio-article-dna"]
    if cm:
        classes = cm.group(2).split()
        classes.extend(x for x in wanted if x not in classes)
        attrs = attrs[:cm.start()] + 'class="' + " ".join(classes) + '"' + attrs[cm.end():]
    else: attrs += ' class="factory-remodel-v1 savingio-article-dna"'
    return doc[:match.start()] + f"<body{attrs}>" + doc[match.end():]

def add_styles(doc: str) -> str:
    doc = re.sub(r'<link[^>]+factory-remodel-v1\.css[^>]*>', '', doc, flags=re.I)
    tag = '<link rel="stylesheet" href="/css/factory-remodel-v1.css?v=2" data-savingio-full-remodel="v1">'
    return re.sub(r"</head\s*>", tag + "\n</head>", doc, count=1, flags=re.I)

def normalize_brain_loader(doc: str) -> str:
    doc = re.sub(r'<script[^>]+(?:savingio-brain-data\.js|savingio-brain-navigation\.js)[^>]*>\s*</script>', '', doc, flags=re.I)
    loader = '<script src="/data/savingio-brain-data.js?v=10"></script><script src="/js/savingio-brain-navigation.js?v=10"></script>'
    return re.sub(r'</body\s*>', loader + '</body>', doc, count=1, flags=re.I)

def thumbnail(title: str, group: str) -> str:
    label, icon = {"leak": ("긴급 생활", "💧"), "rent": ("전월세", "🏠"), "tax": ("주택 세금", "📄"), "bill": ("관리비", "💡")}[group]
    return f'<figure class="factory-topic-thumbnail" data-factory-hero="true" aria-label="글 핵심 주제"><div class="factory-topic-thumbnail__icon" aria-hidden="true">{icon}</div><figcaption><span>Savingio · {label}</span><strong>{html_lib.escape(title)}</strong><em>지금 필요한 순서만 빠르게 확인하세요</em></figcaption></figure>'

def add_thumbnail(doc: str, title: str, group: str) -> str:
    if "data-factory-hero=" in doc: return doc
    hero = re.search(r'<section\b[^>]*class=["\'][^"\']*\bhero\b[^"\']*["\'][^>]*>', doc, re.I)
    if hero:
        close = doc.find("</section>", hero.end())
        if close >= 0:
            close += len("</section>")
            return doc[:close] + thumbnail(title, group) + doc[close:]
    main = re.search(r"<main\b[^>]*>", doc, re.I)
    if main: return doc[:main.end()] + thumbnail(title, group) + doc[main.end():]
    raise ValueError("thumbnail insertion point missing")

def add_journey(doc: str, group: str) -> str:
    if 'data-savingio-related-path="v1"' in doc: return doc
    cards = "".join(f'<a class="factory-related-card" href="{href}"><strong>{html_lib.escape(label)}</strong><span>{html_lib.escape(note)}</span></a>' for label, href, note in PATHS[group])
    block = f'<section class="factory-related-path" data-savingio-related-path="v1" aria-labelledby="factory-related-title"><p class="factory-related-eyebrow">다음 문제까지 이어서 해결</p><h2 id="factory-related-title">지금 상황과 함께 많이 찾는 글</h2><div class="factory-related-grid">{cards}</div></section>'
    footer = re.search(r"<footer\b", doc, re.I)
    pos = footer.start() if footer else doc.lower().rfind("</body>")
    if pos < 0: raise ValueError("journey insertion point missing")
    return doc[:pos] + block + doc[pos:]

def remodel(path: Path) -> dict:
    original = path.read_text(encoding="utf-8"); title = title_of(original); group = group_for(path.name, title)
    doc = normalize_brain_loader(add_journey(add_thumbnail(add_styles(add_body_classes(original)), title, group), group))
    path.write_text(doc, encoding="utf-8", newline="")
    return {"file": path.name, "title": title, "group": group, "changed": doc != original, "thumbnail": doc.count('data-factory-hero="true"') == 1, "related_path": doc.count('data-savingio-related-path="v1"') == 1, "h1": len(re.findall(r"<h1\b", doc, re.I))}

def run(root: Path, batch: int) -> dict:
    if batch != 1: raise ValueError("only reviewed batch 1 is defined")
    results = [remodel(root / "articles" / name) for name in BATCH_01]
    report = {"batch": batch, "count": len(results), "passed": sum(r["thumbnail"] and r["related_path"] and r["h1"] == 1 for r in results), "items": results}
    output = root / "factory" / "output" / "article_remodel" / "batch-01.json"
    output.parent.mkdir(parents=True, exist_ok=True); output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return report

if __name__ == "__main__":
    parser = argparse.ArgumentParser(); parser.add_argument("--project-root", default="."); parser.add_argument("--batch", type=int, default=1); args = parser.parse_args()
    print(json.dumps(run(Path(args.project_root).resolve(), args.batch), ensure_ascii=False, indent=2))
