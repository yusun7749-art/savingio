import tempfile
import unittest
from pathlib import Path

from factory.article_connection_batch import render_path, upsert_path


class ArticleConnectionBatchTests(unittest.TestCase):
    def test_upsert_inserts_before_related_section(self):
        html = "<article><p>본문</p><section><h2>이것도 같이 확인하세요</h2></section></article>"
        block = '<section data-savingio-problem-path="v1"><h2>순서</h2></section>'
        updated, changed = upsert_path(html, block)
        self.assertTrue(changed)
        self.assertLess(updated.index("data-savingio-problem-path"), updated.index("이것도 같이"))

    def test_upsert_is_idempotent(self):
        first = '<section data-savingio-problem-path="v1"><h2>기존</h2></section>'
        replacement = '<section data-savingio-problem-path="v1"><h2>새 값</h2></section>'
        updated, changed = upsert_path(f"<article>{first}</article>", replacement)
        self.assertTrue(changed)
        self.assertEqual(updated.count("data-savingio-problem-path"), 1)
        self.assertIn("새 값", updated)

    def test_render_marks_current_article(self):
        from factory.article_connection_batch import ArticleNode

        nodes = [
            ArticleNode("첫 글", "/articles/a.html", "대", "중", "소"),
            ArticleNode("둘째 글", "/articles/b.html", "대", "중", "소"),
        ]
        rendered = render_path("/articles/b.html", nodes)
        self.assertEqual(rendered.count('aria-current="step"'), 1)
        self.assertIn("둘째 글", rendered)


if __name__ == "__main__":
    unittest.main()
