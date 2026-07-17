import tempfile
import unittest
from pathlib import Path
from factory.search_index_builder import article_meta, compact, expand_synonyms


class SearchIndexBuilderTests(unittest.TestCase):
    def test_redirect_page_is_detected(self):
        with tempfile.TemporaryDirectory() as td:
            path = Path(td) / "redirect.html"
            path.write_text('<meta http-equiv="refresh" content="0;url=/articles/real.html"><h1>페이지 이동</h1>', encoding="utf-8")
            self.assertTrue(article_meta(path)["is_redirect"])
    def test_compact_matches_spaced_and_unspaced_query(self):
        self.assertEqual(compact("윗집 누수"), compact("윗집누수"))

    def test_leak_intents_are_not_spread_to_water_bill_articles(self):
        expanded = expand_synonyms({"수도 누수 자가진단"})
        self.assertNotIn("아랫집누수", expanded)

    def test_relationship_terms_are_preserved(self):
        expanded = expand_synonyms({"장기수선충당금", "보험 확인"})
        self.assertIn("아파트수선충당금", expanded)


if __name__ == "__main__":
    unittest.main()
