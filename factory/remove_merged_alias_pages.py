from __future__ import annotations

import json
import re
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
ARTICLES = ROOT / "articles"
REPORT_DIR = ROOT / "factory" / "QA"

REDIRECT_PATTERNS = [
    re.compile(r'<meta[^>]+http-equiv=["\']?refresh["\']?[^>]*>', re.I),
    re.compile(r'location\.(?:href|replace|assign)\s*\(', re.I),
    re.compile(r'window\.location\s*=', re.I),
]


def own_url(path: Path) -> str:
    return f"https://savingio.com/articles/{path.stem}.html"


def canonical(text: str) -> str:
    for pattern in (
        r'<link[^>]+rel=["\']canonical["\'][^>]+href=["\']([^"\']+)',
        r'<link[^>]+href=["\']([^"\']+)["\'][^>]+rel=["\']canonical["\']',
    ):
        m = re.search(pattern, text, re.I)
        if m:
            return m.group(1).strip()
    return ""


def is_alias_stub(path: Path, text: str) -> tuple[bool, list[str]]:
    reasons: list[str] = []
    if any(p.search(text) for p in REDIRECT_PATTERNS):
        reasons.append("client-redirect")
    can = canonical(text)
    if can:
        can_path = urlparse(can).path.rstrip("/")
        own_path = f"/articles/{path.stem}.html"
        own_noext = f"/articles/{path.stem}"
        if can_path not in {own_path, own_noext}:
            reasons.append("canonical-to-other-page")
    visible_text = re.sub(r'<script\b[^>]*>.*?</script>', ' ', text, flags=re.I | re.S)
    visible_text = re.sub(r'<style\b[^>]*>.*?</style>', ' ', visible_text, flags=re.I | re.S)
    visible_text = re.sub(r'<[^>]+>', ' ', visible_text)
    visible_text = re.sub(r'\s+', ' ', visible_text).strip()
    if len(visible_text) < 450:
        reasons.append("redirect-size")
    alias = ("client-redirect" in reasons or "canonical-to-other-page" in reasons) and "redirect-size" in reasons
    return alias, reasons


def remove_references(removed_paths: list[str]) -> list[str]:
    changed: list[str] = []
    needles = set()
    for rel in removed_paths:
        stem = Path(rel).stem
        needles.update({f"/articles/{stem}.html", f"/articles/{stem}"})

    targets = [ROOT / "data", ROOT / "js", ROOT / "categories", ROOT / "factory"]
    allowed = {".js", ".json", ".html", ".md", ".txt", ".xml"}
    for base in targets:
        if not base.exists():
            continue
        for path in base.rglob("*"):
            if not path.is_file() or path.suffix.lower() not in allowed:
                continue
            if path.name in {"remove_merged_alias_pages.py"}:
                continue
            text = path.read_text(encoding="utf-8", errors="ignore")
            original = text
            if path.suffix.lower() in {".json", ".js"}:
                # Remove simple object/array rows containing retired article hrefs.
                lines = text.splitlines()
                filtered = [line for line in lines if not any(n in line for n in needles)]
                text = "\n".join(filtered) + ("\n" if original.endswith("\n") else "")
            elif path.suffix.lower() in {".md", ".txt"}:
                lines = text.splitlines()
                filtered = [line for line in lines if not any(n in line for n in needles)]
                text = "\n".join(filtered) + ("\n" if original.endswith("\n") else "")
            else:
                for needle in needles:
                    text = re.sub(rf'<a\b[^>]*href=["\']{re.escape(needle)}["\'][^>]*>.*?</a>', '', text, flags=re.I | re.S)
            if text != original:
                path.write_text(text, encoding="utf-8")
                changed.append(path.relative_to(ROOT).as_posix())
    return sorted(set(changed))


def main() -> None:
    removed: list[dict] = []
    for path in sorted(ARTICLES.glob("*.html")):
        if path.name == "index.html":
            continue
        text = path.read_text(encoding="utf-8", errors="ignore")
        alias, reasons = is_alias_stub(path, text)
        if not alias:
            continue
        removed.append({
            "path": path.relative_to(ROOT).as_posix(),
            "canonical": canonical(text),
            "reasons": reasons,
            "bytes": path.stat().st_size,
        })
        path.unlink()

    changed_refs = remove_references([item["path"] for item in removed]) if removed else []
    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    payload = {
        "task": "remove-merged-alias-pages",
        "deleted_count": len(removed),
        "deleted": removed,
        "reference_files_updated": changed_refs,
        "rule": "redirect-only or canonical-to-another-article stubs are removed; representative articles remain",
    }
    (REPORT_DIR / "MERGED_ALIAS_REMOVAL.json").write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    lines = [
        "# 통합 후 잔존 주소 삭제 결과",
        "",
        f"- 삭제된 통합 별칭 HTML: **{len(removed)}개**",
        f"- 참조 정리 파일: **{len(changed_refs)}개**",
        "",
        "| 삭제 파일 | 대표 canonical | 근거 |",
        "|---|---|---|",
    ]
    for item in removed:
        lines.append(f"| `{item['path']}` | `{item['canonical']}` | {', '.join(item['reasons'])} |")
    lines += ["", "## 참조 정리", ""] + [f"- `{p}`" for p in changed_refs]
    (REPORT_DIR / "MERGED_ALIAS_REMOVAL.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(json.dumps({"deleted": len(removed), "updated_refs": len(changed_refs)}, ensure_ascii=False))


if __name__ == "__main__":
    main()
