from __future__ import annotations

import argparse
import hashlib
import json
import os
import shutil
import tempfile
from datetime import datetime
from pathlib import Path

from .article_remodel_test_runner import parse_article, resolve_internal, run as run_isolated_test

VERSION = "1.0.0"
TEST_REPORT = Path("factory/output/article_remodel_test/report.json")
TEST_SITE = Path("factory/output/article_remodel_test/site")
APPLY_OUTPUT = Path("factory/output/article_remodel_apply")
BACKUP_ROOT = Path("factory/backups/article_remodel")
STYLE_NAME = "article-layout-dna.css"


def now_stamp() -> str:
    return datetime.now().astimezone().strftime("%Y%m%d-%H%M%S-%f")


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as fp:
        for chunk in iter(lambda: fp.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def load_json(path: Path) -> dict:
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, dict):
        raise ValueError(f"JSON object required: {path}")
    return payload


def strict_test_pass(report: dict) -> bool:
    source_count = int(report.get("source_count", 0))
    return bool(
        report.get("pass") is True
        and source_count > 0
        and int(report.get("output_count", -1)) == source_count
        and int(report.get("structural_pass_count", -1)) == source_count
        and int(report.get("structural_fail_count", -1)) == 0
        and int(report.get("error_count", -1)) == 0
        and int(report.get("broken_internal_link_count", -1)) == 0
    )


def atomic_copy(source: Path, destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    fd, temp_name = tempfile.mkstemp(prefix=f".{destination.name}.", suffix=".tmp", dir=destination.parent)
    os.close(fd)
    temp_path = Path(temp_name)
    try:
        shutil.copy2(source, temp_path)
        os.replace(temp_path, destination)
    finally:
        if temp_path.exists():
            temp_path.unlink()


def verify_live_article(root: Path, path: Path) -> list[str]:
    issues: list[str] = []
    html = path.read_text(encoding="utf-8")
    parser = parse_article(html)
    if not parser.title.strip():
        issues.append("missing_title")
    if not parser.meta_description:
        issues.append("missing_meta_description")
    if not parser.canonical:
        issues.append("missing_canonical")
    if parser.h1_count != 1:
        issues.append(f"h1_count:{parser.h1_count}")
    if "article-layout-dna.css" not in html:
        issues.append("missing_layout_css")
    if "savingio-article-dna" not in html:
        issues.append("missing_body_class")
    broken: list[str] = []
    for href in parser.links:
        target = resolve_internal(root, href)
        if target is not None and not target.is_file():
            broken.append(href)
    if broken:
        issues.append(f"broken_internal_links:{len(set(broken))}")
    return issues


def run(project_root: Path, *, refresh_test: bool = True) -> dict:
    root = project_root.resolve()
    articles_dir = root / "articles"
    if not articles_dir.is_dir():
        raise FileNotFoundError(f"articles directory not found: {articles_dir}")

    if refresh_test:
        run_isolated_test(root, clean=True)

    report_path = root / TEST_REPORT
    if not report_path.is_file():
        raise FileNotFoundError(f"remodel test report not found: {report_path}")
    test_report = load_json(report_path)
    if not strict_test_pass(test_report):
        raise RuntimeError("strict remodel test gate failed; live articles were not changed")

    sandbox_articles = root / TEST_SITE / "articles"
    sandbox_css = root / TEST_SITE / "css" / STYLE_NAME
    source_files = sorted(sandbox_articles.glob("*.html"))
    if len(source_files) != int(test_report["source_count"]):
        raise RuntimeError("sandbox article count does not match test report")
    if not sandbox_css.is_file():
        raise FileNotFoundError(f"sandbox CSS not found: {sandbox_css}")

    live_files = sorted(p for p in articles_dir.glob("*.html") if p.name.lower() != "index.html")
    if {p.name for p in live_files} != {p.name for p in source_files}:
        raise RuntimeError("live/sandbox article filename sets differ; live articles were not changed")

    stamp = now_stamp()
    backup_dir = root / BACKUP_ROOT / stamp
    backup_articles = backup_dir / "articles"
    backup_css = backup_dir / "css" / STYLE_NAME
    backup_articles.mkdir(parents=True, exist_ok=False)

    before_hashes = {p.name: sha256(p) for p in live_files}
    for live in live_files:
        shutil.copy2(live, backup_articles / live.name)
    live_css = root / "css" / STYLE_NAME
    if live_css.is_file():
        backup_css.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(live_css, backup_css)

    changed: list[str] = []
    try:
        for source in source_files:
            destination = articles_dir / source.name
            if sha256(source) != sha256(destination):
                atomic_copy(source, destination)
                changed.append(destination.relative_to(root).as_posix())
        if not live_css.is_file() or sha256(sandbox_css) != sha256(live_css):
            atomic_copy(sandbox_css, live_css)
            changed.append(live_css.relative_to(root).as_posix())

        verification_failures: dict[str, list[str]] = {}
        hash_mismatches: list[str] = []
        for source in source_files:
            live = articles_dir / source.name
            if sha256(source) != sha256(live):
                hash_mismatches.append(source.name)
            issues = verify_live_article(root, live)
            if issues:
                verification_failures[live.relative_to(root).as_posix()] = issues
        if hash_mismatches or verification_failures:
            raise RuntimeError(
                f"post-apply verification failed: hash={len(hash_mismatches)}, structure={len(verification_failures)}"
            )

        after_hashes = {p.name: sha256(p) for p in live_files}
        unchanged_count = sum(1 for name, value in before_hashes.items() if after_hashes[name] == value)
        result = {
            "version": VERSION,
            "mode": "live_article_remodel_apply",
            "status": "passed",
            "pass": True,
            "source_count": len(source_files),
            "applied_article_count": len(source_files) - unchanged_count,
            "unchanged_article_count": unchanged_count,
            "changed_file_count": len(changed),
            "changed_files": changed,
            "backup_path": backup_dir.relative_to(root).as_posix(),
            "strict_test_report": TEST_REPORT.as_posix(),
            "post_apply_verified_count": len(source_files),
            "broken_internal_link_count": 0,
            "sitemap_regeneration_required": False,
            "sitemap_reason": "article filenames and URLs were unchanged",
            "finished_at": datetime.now().astimezone().isoformat(timespec="seconds"),
        }
    except Exception as exc:
        for backup in backup_articles.glob("*.html"):
            atomic_copy(backup, articles_dir / backup.name)
        if backup_css.is_file():
            atomic_copy(backup_css, live_css)
        result = {
            "version": VERSION,
            "mode": "live_article_remodel_apply",
            "status": "rolled_back",
            "pass": False,
            "error": f"{type(exc).__name__}: {exc}",
            "backup_path": backup_dir.relative_to(root).as_posix(),
            "rolled_back": True,
            "finished_at": datetime.now().astimezone().isoformat(timespec="seconds"),
        }

    output_dir = root / APPLY_OUTPUT
    output_dir.mkdir(parents=True, exist_ok=True)
    (output_dir / "report.json").write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return result


def main() -> int:
    parser = argparse.ArgumentParser(description="Safely apply the verified article remodel sandbox to live articles.")
    parser.add_argument("--project-root", default=".")
    parser.add_argument("--use-existing-test", action="store_true", help="Do not refresh the isolated test first.")
    args = parser.parse_args()
    result = run(Path(args.project_root), refresh_test=not args.use_existing_test)
    return 0 if result.get("pass") else 1


if __name__ == "__main__":
    raise SystemExit(main())
