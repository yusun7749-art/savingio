import json, os, subprocess, sys, tempfile, unittest
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

from factory.git_release_executor import repository_status, execute_release
from factory.cloudflare_deployment_monitor import parse_deployment, monitor_with_client
from factory.runtime_config import write_env_template
from factory.wordpress_upsert import upsert_post

class FakeCloudflareClient:
    def __init__(self, statuses):
        self.statuses = list(statuses)
    def latest_deployment(self):
        status = self.statuses.pop(0) if self.statuses else "success"
        return {"status":"ok","deployment":{"id":"d1","latest_stage":{"status":status},"url":"https://example.pages.dev"}}

class FakeWordPressConnector:
    def __init__(self, existing=None):
        self.existing = existing or []
        self.calls = []
    def _request(self, method, endpoint, payload=None):
        self.calls.append((method, endpoint, payload))
        if method == "GET":
            return {"status":"ok","payload":self.existing}
        return {"status":"ok","payload":{"id":77}}
    def update_post(self, post_id, **fields):
        self.calls.append(("UPDATE", post_id, fields))
        return {"status":"ok","payload":{"id":post_id}}
    def create_post(self, title, html, slug, status="draft", category_ids=None, tag_ids=None, featured_media=None):
        self.calls.append(("CREATE", slug, status))
        return {"status":"ok","payload":{"id":88}}

class V2031Tests(unittest.TestCase):
    def test_parse_cloudflare_success(self):
        parsed = parse_deployment({"deployment":{"id":"x","latest_stage":{"status":"success"}}})
        self.assertTrue(parsed["terminal"])
        self.assertTrue(parsed["success"])

    def test_cloudflare_monitor_sequence(self):
        result = monitor_with_client(FakeCloudflareClient(["queued","active","success"]), timeout_seconds=3, poll_seconds=0)
        self.assertEqual(result["status"], "success")
        self.assertGreaterEqual(len(result["history"]), 3)

    def test_wordpress_upsert_updates_existing(self):
        connector = FakeWordPressConnector(existing=[{"id":9,"slug":"a"}])
        result = upsert_post(connector,"A","<p>A</p>","a")
        self.assertEqual(result["action"],"updated")
        self.assertEqual(result["post_id"],9)

    def test_wordpress_upsert_creates_new(self):
        connector = FakeWordPressConnector(existing=[])
        result = upsert_post(connector,"A","<p>A</p>","a")
        self.assertEqual(result["action"],"created")
        self.assertEqual(result["post_id"],88)

    def test_env_template(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            result = write_env_template(root)
            path = root / result["path"]
            self.assertTrue(path.exists())
            text = path.read_text(encoding="utf-8")
            self.assertIn("WORDPRESS_URL=", text)
            self.assertIn("CLOUDFLARE_API_TOKEN=", text)

    def test_real_temp_git_dry_run(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            subprocess.run(["git","init","-b","main"],cwd=root,check=True,capture_output=True,text=True)
            subprocess.run(["git","config","user.email","test@example.com"],cwd=root,check=True)
            subprocess.run(["git","config","user.name","Test"],cwd=root,check=True)
            subprocess.run(["git","remote","add","origin","https://example.com/repo.git"],cwd=root,check=True)
            (root/"a.txt").write_text("x",encoding="utf-8")
            status = repository_status(root)
            self.assertTrue(status["ready"])
            result = execute_release(root,["a.txt"],"test",push=False,dry_run=True)
            self.assertEqual(result["status"],"dry_run")
            commands = result["plan"]["commands"]
            self.assertEqual(commands[0][:3],["git","add","--"])
            self.assertNotIn(".",commands[0][3:])

if __name__=="__main__":
    unittest.main()
