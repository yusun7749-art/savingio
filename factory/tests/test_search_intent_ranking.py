import json
import re
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
LEAK = "/articles/apartment-leak-emergency-response.html"
INSURANCE = "/articles/daily-liability-leak-insurance.html"
RESERVE = "/articles/장기수선충당금-소유자-부담과-임차인-반환-확인-107af18f.html"


def compact(value: str) -> str:
    return re.sub(r"[^0-9a-zA-Z가-힣]+", "", value).lower()


class SearchIntentRankingTests(unittest.TestCase):
    def setUp(self):
        self.items = json.loads((ROOT / "data/savingio-search-index.json").read_text(encoding="utf-8"))["items"]

    def test_high_intent_aliases_are_owned_by_the_right_articles(self):
        expected = {
            LEAK: ("누수", "아랫집 누수", "윗집 누수", "천장 누수"),
            INSURANCE: ("일배책 누수", "누수 보험처리"),
            RESERVE: ("장기충당금", "장충금", "수선충당금"),
        }
        for href, queries in expected.items():
            aliases = {compact(value) for value in self.items[href]["exact_queries"]}
            self.assertTrue(all(compact(query) in aliases for query in queries))

    def test_water_meter_article_does_not_claim_upstairs_downstairs_intent(self):
        aliases = {compact(value) for value in self.items["/articles/home-water-leak-self-check.html"]["exact_queries"]}
        self.assertNotIn(compact("아랫집 누수"), aliases)
        self.assertNotIn(compact("윗집 누수"), aliases)


    def test_all_search_surfaces_load_the_shared_search_core(self):
        self.assertIn("/js/savingio-search-core.js", (ROOT / "index.html").read_text(encoding="utf-8"))
        self.assertIn("/js/savingio-search-core.js", (ROOT / "articles/index.html").read_text(encoding="utf-8"))
        self.assertIn("core.score", (ROOT / "js/savingio-brain-navigation.js").read_text(encoding="utf-8"))
