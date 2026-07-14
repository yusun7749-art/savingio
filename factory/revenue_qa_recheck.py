from __future__ import annotations
from pathlib import Path
import re
from .qa import evaluate
from .utils import save_json, text_only, now_iso

def extract_context(html: str, target: Path, project_root: Path) -> tuple[dict,dict,dict]:
    title_match = re.search(r"<title>(.*?)</title>", html, re.I|re.S)
    h1_match = re.search(r"<h1[^>]*>(.*?)</h1>", html, re.I|re.S)
    desc_match = re.search(r'<meta\s+name=["\']description["\']\s+content=["\'](.*?)["\']',html,re.I|re.S)
    canonical_match = re.search(r'<link[^>]+rel=["\']canonical["\'][^>]+href=["\'](.*?)["\']',html,re.I|re.S)
    slug = target.stem if target.name != "index.html" else target.parent.name
    title = text_only((title_match or h1_match).group(1)) if (title_match or h1_match) else slug
    description = text_only(desc_match.group(1)) if desc_match else (title+"의 핵심 내용을 정리했습니다.")
    canonical = canonical_match.group(1) if canonical_match else f"https://savingio.com/articles/{slug}.html"
    seo = {"title":title[:70],"description":description[:180],"slug":slug,"canonical":canonical,"schema":{}}
    plan = {"topic":title,"slug":slug,"article_type":"general","category":"생활정보","required_sections":["summary","toc","eligibility","steps","checklist","faq","next-action"]}
    research = {"ready_for_publish":"공식 근거 입력 대기" not in html,"evidence_score":100 if "공식 근거 입력 대기" not in html else 0}
    return plan,research,seo

def recheck_article(project_root: Path, article_path: Path) -> dict:
    html = article_path.read_text(encoding="utf-8")
    plan,research,seo = extract_context(html,article_path,project_root)
    qa = evaluate(html,plan,research,seo,project_root/"factory"/"config")
    result = {"article_path":article_path.relative_to(project_root).as_posix(),"qa":qa,"seo":seo,"research":research,"checked_at":now_iso()}
    save_json(project_root/"factory"/"output"/"revenue"/"qa"/f"{article_path.stem}.json",result)
    return result
