import sys, tempfile, unittest, json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT))

from factory.contracts import load_contracts, validate_packet
from factory.image_engine import build_image_brief, save_image_manifest
from factory.supervisor import Supervisor
from factory.approval_center import create_approval_request, approve, reject
from factory.site_adapters import StaticHtmlAdapter, WordPressAdapter, NaverAdapter

class V2022Tests(unittest.TestCase):
    def test_contracts(self):
        contracts=load_contracts(ROOT/"factory"/"config")
        self.assertIn("planning",contracts["departments"])
        result=validate_packet({"topic":"x"},contracts["departments"]["planning"])
        self.assertFalse(result["pass"])

    def test_image_manifest(self):
        with tempfile.TemporaryDirectory() as td:
            root=Path(td)
            brief=build_image_brief(
                {"topic":"전기요금","slug":"x"},
                {"slug":"x"},
                ROOT/"factory"/"config"
            )
            manifest=save_image_manifest(root,brief)
            self.assertFalse(manifest["ready"])
            self.assertTrue(manifest["requires_external_image_generation"])

    def test_approval(self):
        with tempfile.TemporaryDirectory() as td:
            root=Path(td)
            report={
                "topic":"x","seo":{"slug":"x"},"qa":{"score":100},
                "research":{"evidence_score":50},"cms":{"article_path":"a.html"},
                "image":{"ready":True},"supervisor":{"pass":True}
            }
            req=create_approval_request(root,report)
            ok=approve(root,req["token"],"ok")
            self.assertEqual(ok["status"],"approved")

    def test_approval_accepts_current_cms_handoff(self):
        with tempfile.TemporaryDirectory() as td:
            root=Path(td)
            report={"items":[{
                "topic":"장기수선충당금","slug":"reserve-refund",
                "qa1_score":100,"research_qa_score":100,
                "article_path":"articles/reserve-refund.html",
                "image_ready":True,"qa2_pass":True,
                "release_status":"content_ready",
            }]}
            req=create_approval_request(root,report)
            self.assertEqual(req["slug"],"reserve-refund")
            self.assertEqual(req["release_status"],"content_ready")
            self.assertTrue(req["image_ready"])
            self.assertTrue(req["supervisor_pass"])

    def test_adapters(self):
        payload={"title":"A","html":"<h1>A</h1>","slug":"a"}
        self.assertTrue(StaticHtmlAdapter().prepare(ROOT,payload)["ready"])
        self.assertTrue(WordPressAdapter().prepare(ROOT,payload)["requires_credentials"])
        self.assertTrue(NaverAdapter().prepare(ROOT,payload)["requires_browser_automation"])

if __name__=="__main__":
    unittest.main()
