import json, os, sys, tempfile, unittest
from pathlib import Path
from unittest.mock import patch

ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT))

from factory.google_service_auth import service_readiness
from factory.search_console_engine import build_query_request, import_search_console_export
from factory.ga4_engine import build_run_report_request, import_ga4_export
from factory.analytics_dashboard import build_analytics_dashboard
from factory.content_performance_optimizer import recommend_from_dashboard

class V2033Tests(unittest.TestCase):
    def test_google_readiness_missing(self):
        with patch.dict(os.environ,{},clear=True):
            result=service_readiness("search_console")
            self.assertFalse(result["ready"])
            self.assertIn("GOOGLE_SERVICE_ACCOUNT_JSON",result["missing_env"])

    def test_search_console_import(self):
        with tempfile.TemporaryDirectory() as td:
            root=Path(td)
            path=root/"sc.json"
            path.write_text(json.dumps({"rows":[
                {"keys":["2026-07-01","https://savingio.com/a","절약"],"clicks":10,"impressions":100,"ctr":0.1,"position":3.2}
            ]},ensure_ascii=False),encoding="utf-8")
            result=import_search_console_export(root,path)
            self.assertEqual(result["row_count"],1)
            self.assertEqual(result["totals"]["clicks"],10)

    def test_ga4_import(self):
        with tempfile.TemporaryDirectory() as td:
            root=Path(td)
            path=root/"ga.json"
            path.write_text(json.dumps({
                "dimensionHeaders":[{"name":"date"},{"name":"pagePath"}],
                "metricHeaders":[{"name":"screenPageViews"},{"name":"activeUsers"},{"name":"sessions"}],
                "rows":[{"dimensionValues":[{"value":"20260701"},{"value":"/a"}],
                         "metricValues":[{"value":"50"},{"value":"20"},{"value":"25"}]}]
            }),encoding="utf-8")
            result=import_ga4_export(root,path)
            self.assertEqual(result["totals"]["screenPageViews"],50)

    def test_dashboard_and_optimizer(self):
        with tempfile.TemporaryDirectory() as td:
            root=Path(td)
            base=root/"factory"/"output"/"analytics"
            base.mkdir(parents=True)
            (base/"search_console.json").write_text(json.dumps({
                "rows":[{"page":"/a","clicks":1,"impressions":200}]
            }),encoding="utf-8")
            (base/"ga4.json").write_text(json.dumps({
                "rows":[{"pagePath":"/a","screenPageViews":100,"activeUsers":40,"sessions":50}]
            }),encoding="utf-8")
            dashboard=build_analytics_dashboard(root)
            self.assertEqual(dashboard["page_count"],1)
            actions=recommend_from_dashboard(root)
            self.assertEqual(actions["actions"][0]["action"],"rewrite_title_meta")

if __name__=="__main__":
    unittest.main()
