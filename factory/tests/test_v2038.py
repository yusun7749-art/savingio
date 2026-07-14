import json, os, sys, tempfile, unittest
from pathlib import Path
from unittest.mock import patch

ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT))

from factory.external_integration_registry import integration_names
from factory.integration_preflight import run_integration_preflight
from factory.live_verification_plan import build_live_verification_plan
from factory.adsense_report_import import normalize_adsense_rows, import_adsense_report
from factory.adsense_revenue_bridge import bridge_adsense_to_revenue

class V2038Tests(unittest.TestCase):
    def test_registry_names(self):
        names=integration_names(ROOT/"factory"/"config")
        self.assertIn("cloudflare_pages",names)
        self.assertIn("adsense_reporting",names)

    def test_preflight_masks_secrets(self):
        with patch.dict(os.environ,{"OPENAI_API_KEY":"secret-value"},clear=True):
            result=run_integration_preflight(ROOT)
            image=next(x for x in result["integrations"] if x["name"]=="image_provider")
            self.assertTrue(image["ready"])
            self.assertNotIn("secret-value",json.dumps(result))

    def test_live_plan(self):
        with patch.dict(os.environ,{},clear=True):
            result=build_live_verification_plan(ROOT)
            self.assertEqual(result["plan_count"],6)
            self.assertTrue(any(x["status"]=="configuration_required" for x in result["plans"]))

    def test_adsense_normalize(self):
        rows=normalize_adsense_rows([{
            "Page":"https://savingio.com/articles/a.html",
            "Estimated earnings":"2.50",
            "Page views":"500",
            "Impressions":"1000",
            "Clicks":"5"
        }])
        self.assertEqual(rows[0]["page"],"/articles/a.html")
        self.assertAlmostEqual(rows[0]["page_rpm"],5.0)
        self.assertAlmostEqual(rows[0]["cpc"],0.5)

    def test_adsense_import_and_bridge(self):
        with tempfile.TemporaryDirectory() as td:
            root=Path(td)
            analytics=root/"factory"/"output"/"analytics"
            analytics.mkdir(parents=True)
            (analytics/"dashboard.json").write_text(json.dumps({
                "pages":[{"page":"/a","clicks":10,"impressions":500,"page_views":1000,"sessions":700}]
            }),encoding="utf-8")
            (root/"factory"/"config").mkdir(parents=True)
            (root/"factory"/"config"/"revenue_ai_rules.json").write_text(
                (ROOT/"factory"/"config"/"revenue_ai_rules.json").read_text(encoding="utf-8"),encoding="utf-8"
            )
            report=root/"adsense.csv"
            report.write_text("Page,Estimated earnings,Page views,Impressions,Clicks\n/a,0.5,1000,1000,1\n",encoding="utf-8")
            imported=import_adsense_report(root,report)
            self.assertEqual(imported["row_count"],1)
            bridged=bridge_adsense_to_revenue(root)
            self.assertEqual(bridged["status"],"completed")
            self.assertEqual(bridged["revenue_rows"],1)

if __name__=="__main__":
    unittest.main()
