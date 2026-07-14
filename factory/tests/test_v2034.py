import json, os, sys, tempfile, unittest
from pathlib import Path
from unittest.mock import patch

ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT))

from factory.google_jwt_auth import auth_readiness, build_signing_input
from factory.search_console_api import build_endpoint, readiness as sc_readiness
from factory.ga4_api import readiness as ga_readiness
from factory.keyword_rank_tracker import build_keyword_rank_report
from factory.analytics_rework_bridge import dispatch_optimization_actions

class V2034Tests(unittest.TestCase):
    def test_google_auth_missing(self):
        with patch.dict(os.environ,{},clear=True):
            result=auth_readiness("scope")
            self.assertFalse(result["ready"])

    def test_google_signing_input(self):
        account={"client_email":"a@example.com","private_key":"PRIVATE","token_uri":"https://oauth2.googleapis.com/token"}
        result=build_signing_input(account,"scope")
        self.assertIn(".",result["signing_input"])
        self.assertEqual(result["claims"]["scope"],"scope")

    def test_search_console_endpoint(self):
        endpoint=build_endpoint("sc-domain:savingio.com")
        self.assertIn("sc-domain%3Asavingio.com",endpoint)

    def test_api_readiness_missing(self):
        with patch.dict(os.environ,{},clear=True):
            self.assertFalse(sc_readiness()["ready"])
            self.assertFalse(ga_readiness()["ready"])

    def test_keyword_ranking_report(self):
        with tempfile.TemporaryDirectory() as td:
            root=Path(td)
            base=root/"factory"/"output"/"analytics"
            base.mkdir(parents=True)
            (base/"search_console.json").write_text(json.dumps({
                "rows":[
                    {"query":"전기요금","page":"/a","clicks":10,"impressions":100,"position":3},
                    {"query":"전기요금","page":"/b","clicks":5,"impressions":50,"position":5}
                ]
            }),encoding="utf-8")
            report=build_keyword_rank_report(root)
            self.assertEqual(report["keyword_count"],1)
            self.assertAlmostEqual(report["keywords"][0]["position"],3.67,places=2)

    def test_analytics_dispatch(self):
        with tempfile.TemporaryDirectory() as td:
            root=Path(td)
            base=root/"factory"/"output"/"analytics"
            base.mkdir(parents=True)
            (base/"optimization_actions.json").write_text(json.dumps({
                "actions":[{"page":"/a","action":"rewrite_title_meta","reason":"low_ctr"}]
            }),encoding="utf-8")
            result=dispatch_optimization_actions(root)
            self.assertEqual(result["dispatched_count"],1)
            self.assertEqual(result["items"][0]["department"],"seo")

if __name__=="__main__":
    unittest.main()
