from pathlib import Path

from factory.article_remodel_apply_runner import run


ARTICLE = """<!doctype html><html><head><title>{title}</title><meta name=\"description\" content=\"description\"><link rel=\"canonical\" href=\"https://savingio.com/articles/{slug}.html\"></head><body><main><h1>{title}</h1><p>body</p></main></body></html>"""
CSS = ".savingio-article-dna .info-card{margin-block:24px;padding:24px}"


def make_project(root: Path) -> None:
    (root / "articles").mkdir(parents=True)
    (root / "css").mkdir()
    (root / "factory" / "output").mkdir(parents=True)
    (root / "articles" / "a.html").write_text(ARTICLE.format(title="A", slug="a"), encoding="utf-8")
    (root / "articles" / "b.html").write_text(ARTICLE.format(title="B", slug="b"), encoding="utf-8")
    (root / "articles" / "index.html").write_text("<html></html>", encoding="utf-8")
    (root / "css" / "article-layout-dna.css").write_text(CSS, encoding="utf-8")


def test_apply_updates_live_articles_and_creates_backup(tmp_path: Path) -> None:
    make_project(tmp_path)
    result = run(tmp_path)
    assert result["pass"] is True
    assert result["post_apply_verified_count"] == 2
    assert (tmp_path / result["backup_path"] / "articles" / "a.html").is_file()
    for name in ("a.html", "b.html"):
        html = (tmp_path / "articles" / name).read_text(encoding="utf-8")
        assert "savingio-article-dna" in html
        assert "article-layout-dna.css" in html


def test_second_apply_is_idempotent(tmp_path: Path) -> None:
    make_project(tmp_path)
    first = run(tmp_path)
    assert first["pass"] is True
    second = run(tmp_path)
    assert second["pass"] is True
    assert second["applied_article_count"] == 0
