import tempfile
import unittest
from pathlib import Path

from factory.search_index_builder import compact, expand_synonyms


class SearchIndexBuilderTests(unittest.TestCase):
    def test_compact_matches_spaced_and_unspaced_query(self):
        self.assertEqual(compact("윗집 누수"), compact("윗집누수"))

    def test_leak_expands_user_search_variants(self):
        expanded = expand_synonyms({"수도 누수 자가진단"})
        for query in ("누수", "윗집누수", "아랫집누수", "천장누수", "물이새요"):
            self.assertIn(query, expanded)

    def test_relationship_terms_are_preserved(self):
        expanded = expand_synonyms({"장기수선충당금", "누수", "보험 확인"})
        self.assertIn("아파트수선충당금", expanded)
        self.assertIn("윗집누수", expanded)


if __name__ == "__main__":
    unittest.main()
