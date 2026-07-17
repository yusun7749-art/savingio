import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

class ArticleLayoutContractTests(unittest.TestCase):
    def test_every_article_has_viewport_and_a_style_source(self):
        failures = []
        for path in sorted((ROOT / "articles").glob("*.html")):
            if path.name == "index.html": continue
            source = path.read_text(encoding="utf-8")
            if 'name="viewport"' not in source: failures.append(f"{path.name}: viewport")
            if "<style" not in source and 'rel="stylesheet"' not in source: failures.append(f"{path.name}: stylesheet")
        self.assertEqual([], failures)

    def test_factory_shell_articles_load_the_factory_layout(self):
        failures = []
        for path in sorted((ROOT / "articles").glob("*.html")):
            source = path.read_text(encoding="utf-8")
            if 'class="article-shell"' in source and "/css/factory-article.css" not in source: failures.append(path.name)
        self.assertEqual([], failures)

    def test_shared_layout_has_overflow_guards(self):
        source = (ROOT / "css" / "article-layout-dna.css").read_text(encoding="utf-8")
        for rule in ("overflow-x: hidden", "overflow-wrap: anywhere", "overflow-x: auto", "max-width: 100%"):
            self.assertIn(rule, source)

    def test_factory_layout_has_mobile_table_scroll(self):
        source = (ROOT / "css" / "factory-article.css").read_text(encoding="utf-8")
        self.assertRegex(source, re.compile(r"\.factory-article \.table-wrap\{[^}]*overflow-x:auto"))
