import csv, json, sys, tempfile, unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT))

from factory.revenue_import import normalize_revenue_rows, import_revenue
from factory.revenue_dashboard import build_revenue_dashboard
from factory.revenue_ai import analyze_revenue
from factory.revenue_task_router import route_revenue_actions
from factory.revenue_core import run_revenue_core

class V2037ATests(unittest.TestCase):
    def test_normalize_metrics(self):
        rows=normalize_revenue_rows([{
            "page":"https://savingio.com/articles/a.html",
            "earnings":"2.50","impressions":"1000","clicks":"5","page_views":"500"
        }])
        self.assertEqual(rows[0]["page"],"/articles/a.html")
        self.assertAlmostEqual(rows[0]["page_rpm"],5.0)
        self.assertAlmostEqual(rows[0]["cpc"],0.5)

    def test_csv_import(self):
        with tempfile.TemporaryDirectory() as td:
            root=Path(td)
            path=root/"revenue.csv"
            path.write_text("page,earnings,impressions,clicks,page_views\n/a,1.5,100,2,200\n",encoding="utf-8")
            result=import_revenue(root,path)
            self.assertEqual(result["row_count"],1)
            self.assertEqual(result["totals"]["earnings"],1.5)

    def test_dashboard_and_ai(self):
        with tempfile.TemporaryDirectory() as td:
            root=Path(td)
            analytics=root/"factory"/"output"/"analytics"
            revenue=root/"factory"/"output"/"revenue"
            analytics.mkdir(parents=True); revenue.mkdir(parents=True)
            (analytics/"dashboard.json").write_text(json.dumps({
                "pages":[{"page":"/a","clicks":1,"impressions":500,"page_views":1000,"sessions":700}]
            }),encoding="utf-8")
            (revenue/"revenue_data.json").write_text(json.dumps({
                "rows":[{"page":"/a","earnings":0.5,"ad_impressions":1000,"ad_clicks":1,"page_views":1000}]
            }),encoding="utf-8")
            dashboard=build_revenue_dashboard(root)
            self.assertEqual(dashboard["page_count"],1)
            analysis=analyze_revenue(root)
            actions={x["action"] for x in analysis["actions"]}
            self.assertIn("rewrite_title_meta",actions)
            self.assertIn("review_ad_layout_and_intent",actions)

    def test_route_actions(self):
        with tempfile.TemporaryDirectory() as td:
            root=Path(td)
            base=root/"factory"/"output"/"revenue"
            base.mkdir(parents=True)
            (base/"revenue_ai_actions.json").write_text(json.dumps({
                "actions":[{"page":"/a","department":"seo","action":"rewrite_title_meta","priority":90,"reason":"low_ctr"}]
            }),encoding="utf-8")
            result=route_revenue_actions(root)
            self.assertEqual(result["routed_count"],1)
            self.assertEqual(result["items"][0]["department"],"seo")

    def test_revenue_core(self):
        with tempfile.TemporaryDirectory() as td:
            root=Path(td)
            analytics=root/"factory"/"output"/"analytics"
            analytics.mkdir(parents=True)
            (analytics/"dashboard.json").write_text(json.dumps({"pages":[]}),encoding="utf-8")
            input_path=root/"revenue.json"
            input_path.write_text(json.dumps({"rows":[]}),encoding="utf-8")
            result=run_revenue_core(root,input_path)
            self.assertEqual(result["status"],"completed")

if __name__=="__main__":
    unittest.main()
