import sys, tempfile, unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT))

from factory.registry import ensure_registry, upsert_content, get_by_slug, registry_summary
from factory.dedupe import title_similarity
from factory.publication import stage_package, approve_package
from factory.link_graph import build_link_graph
from factory.release import build_release_manifest
from factory.state_db import connect, add_queue_item, move_to_dead_letter, list_dead_letter

class V2020Tests(unittest.TestCase):
    def test_registry(self):
        with tempfile.TemporaryDirectory() as td:
            db=Path(td)/"x.db"
            with connect(db) as c:
                ensure_registry(c)
                upsert_content(c,{"slug":"a","topic":"전기","title":"전기 절약","status":"draft"})
                self.assertEqual(get_by_slug(c,"a")["title"],"전기 절약")
                self.assertEqual(registry_summary(c)["draft"],1)

    def test_dedupe_title(self):
        self.assertGreater(title_similarity("전기요금 절약 방법","전기요금 절약하는 방법"),0.8)

    def test_stage_and_approve(self):
        with tempfile.TemporaryDirectory() as td:
            root=Path(td)
            m=stage_package(
                root,{"slug":"a","title":"A","canonical":"https://x/a"},
                "<html>A</html>",{"pass":True,"score":100},
                {"evidence_score":50,"ready_for_publish":True},
                {"duplicate":False},"2.020"
            )
            approved=approve_package(root,"a",m["approval_token"],"ok")
            self.assertEqual(approved["status"],"approved")

    def test_dead_letter(self):
        with tempfile.TemporaryDirectory() as td:
            db=Path(td)/"x.db"
            qid=add_queue_item(db,"fail",1)
            move_to_dead_letter(db,{"id":qid,"topic":"fail","attempts":3},"boom")
            self.assertEqual(len(list_dead_letter(db)),1)

    def test_link_graph(self):
        graph=build_link_graph(ROOT)
        self.assertIn("node_count",graph)
        self.assertIn("broken",graph)

    def test_release_manifest(self):
        with tempfile.TemporaryDirectory() as td:
            root=Path(td)
            (root/"a.txt").write_text("x",encoding="utf-8")
            m=build_release_manifest(root,["a.txt"],"x")
            self.assertEqual(m["file_count"],1)

if __name__=="__main__":
    unittest.main()
