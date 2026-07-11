#!/usr/bin/env python3
from pathlib import Path
from bs4 import BeautifulSoup
import collections, json, sys
ROOT=Path(__file__).resolve().parents[1]
htmls=list(ROOT.rglob("*.html"))
issues=collections.defaultdict(list)
for p in htmls:
    rel=p.relative_to(ROOT).as_posix()
    soup=BeautifulSoup(p.read_text("utf-8",errors="ignore"),"html.parser")
    robots=" ".join((m.get("content") or "") for m in soup.find_all("meta",attrs={"name":"robots"})).lower()
    verification=rel.startswith(("google","naver"))
    if not verification:
        if not soup.title or not soup.title.get_text(strip=True): issues["missing_title"].append(rel)
        if not soup.find("meta",attrs={"name":"description"}): issues["missing_description"].append(rel)
        if "noindex" not in robots and not soup.find("link",rel=lambda x:x and "canonical" in x):
            issues["missing_canonical"].append(rel)
    ids=[x.get("id") for x in soup.find_all(attrs={"id":True})]
    dup=[k for k,v in collections.Counter(ids).items() if v>1]
    if dup: issues["duplicate_ids"].append(f"{rel}: {dup}")
    for i,s in enumerate(soup.find_all("script",attrs={"type":"application/ld+json"})):
        try: json.loads(s.string or s.get_text())
        except Exception as e: issues["invalid_jsonld"].append(f"{rel} #{i}: {e}")
print(f"HTML: {len(htmls)}")
for k,v in issues.items(): print(f"{k}: {len(v)}")
sys.exit(1 if issues else 0)
