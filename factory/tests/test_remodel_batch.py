from __future__ import annotations

import re
import unittest
from pathlib import Path

from factory.remodel_batch import BATCH_01


ROOT = Path(__file__).resolve().parents[2]


class RemodelBatchTests(unittest.TestCase):
    def test_batch_01_is_exactly_twenty_unique_articles(self) -> None:
        self.assertEqual(20, len(BATCH_01))
        self.assertEqual(20, len(set(BATCH_01)))

    def test_batch_01_has_one_thumbnail_and_related_path_each(self) -> None:
        for name in BATCH_01:
            with self.subTest(article=name):
                text = (ROOT / "articles" / name).read_text(encoding="utf-8")
                self.assertEqual(1, text.count('data-factory-hero="true"'))
                self.assertEqual(1, text.count('data-savingio-related-path="v1"'))
                self.assertEqual(1, text.count('data-savingio-full-remodel="v1"'))
                self.assertEqual(1, len(re.findall(r"<h1\b", text, re.I)))
                self.assertIn("factory-remodel-v1", text)

    def test_emergency_path_uses_human_search_language(self) -> None:
        text = (ROOT / "articles" / "apartment-leak-emergency-response.html").read_text(encoding="utf-8")
        for phrase in ("아랫집에서 누수 연락이 왔어요", "일배책으로 누수 보험 처리", "우리 집 누수인지 확인"):
            self.assertIn(phrase, text)

    def test_long_term_reserve_path_contains_common_short_name(self) -> None:
        text = (ROOT / "articles" / "장기수선충당금-소유자-부담과-임차인-반환-확인-107af18f.html").read_text(encoding="utf-8")
        self.assertIn("장기충당금 돌려받기", text)


if __name__ == "__main__":
    unittest.main()
