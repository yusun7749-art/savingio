import json, subprocess, sys, tempfile, unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT))

from factory.approved_release_gate import evaluate_approved_release
from factory.cloudflare_new_deployment import wait_for_new_deployment
from factory.release_journal import append_release_event, verify_release_journal
from factory.approved_republish import run_approved_republish

class FakeCloudflareClient:
    def __init__(self, deployments):
        self.deployments=list(deployments)
    def latest_deployment(self):
        current=self.deployments.pop(0) if self.deployments else {
            "id":"new","latest_stage":{"status":"success"},"url":"https://example.pages.dev"
        }
        return {"status":"ok","deployment":current}

def write_gate_files(root: Path, target: str):
    output=root/"factory"/"output"
    revenue=output/"revenue"
    revenue.mkdir(parents=True)
    (output/"approval_request.json").write_text(json.dumps({"status":"approved","token":"t"}),encoding="utf-8")
    (revenue/"cms_rework_manifest.json").write_text(json.dumps({
        "qa_pass":True,"rollback":False,"target":target
    }),encoding="utf-8")
    (output/"qa_report.json").write_text(json.dumps({"pass":True}),encoding="utf-8")
    (output/"research").mkdir()
    (output/"research"/"research_qa.json").write_text(json.dumps({"pass":True}),encoding="utf-8")
    (output/"image_manifest.json").write_text(json.dumps({"ready":True}),encoding="utf-8")

class V2037CTests(unittest.TestCase):
    def test_approved_gate_pass(self):
        with tempfile.TemporaryDirectory() as td:
            root=Path(td)
            (root/"articles").mkdir()
            (root/"articles"/"a.html").write_text("x",encoding="utf-8")
            write_gate_files(root,"articles/a.html")
            result=evaluate_approved_release(root,["articles/a.html"])
            self.assertTrue(result["pass"])

    def test_gate_blocks_unapproved(self):
        with tempfile.TemporaryDirectory() as td:
            root=Path(td)
            (root/"articles").mkdir()
            (root/"articles"/"a.html").write_text("x",encoding="utf-8")
            write_gate_files(root,"articles/a.html")
            approval=root/"factory"/"output"/"approval_request.json"
            approval.write_text(json.dumps({"status":"waiting_user_approval"}),encoding="utf-8")
            result=evaluate_approved_release(root,["articles/a.html"])
            self.assertFalse(result["pass"])
            self.assertIn("user_approved",result["blockers"])

    def test_waits_for_new_deployment(self):
        client=FakeCloudflareClient([
            {"id":"old","latest_stage":{"status":"success"}},
            {"id":"new","latest_stage":{"status":"active"}},
            {"id":"new","latest_stage":{"status":"success"},"url":"https://example.pages.dev"},
        ])
        result=wait_for_new_deployment(client,"old",timeout_seconds=3,poll_seconds=0)
        self.assertEqual(result["status"],"success")
        self.assertEqual(result["new_deployment_id"],"new")

    def test_release_journal_chain(self):
        with tempfile.TemporaryDirectory() as td:
            root=Path(td)
            append_release_event(root,{"status":"dry_run"})
            append_release_event(root,{"status":"completed"})
            result=verify_release_journal(root)
            self.assertTrue(result["pass"])
            self.assertEqual(result["event_count"],2)

    def test_approved_republish_dry_run_real_git(self):
        with tempfile.TemporaryDirectory() as td:
            root=Path(td)
            subprocess.run(["git","init","-b","main"],cwd=root,check=True,capture_output=True,text=True)
            subprocess.run(["git","config","user.email","test@example.com"],cwd=root,check=True)
            subprocess.run(["git","config","user.name","Test"],cwd=root,check=True)
            subprocess.run(["git","remote","add","origin","https://example.com/repo.git"],cwd=root,check=True)
            (root/"articles").mkdir()
            (root/"articles"/"a.html").write_text("changed",encoding="utf-8")
            write_gate_files(root,"articles/a.html")
            result=run_approved_republish(
                root,["articles/a.html"],"test release",
                execute=False,verify_cloudflare=False,verify_site=False
            )
            self.assertEqual(result["status"],"dry_run")
            self.assertEqual(result["git"]["status"],"dry_run")

if __name__=="__main__":
    unittest.main()
