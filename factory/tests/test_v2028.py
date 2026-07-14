import json, sys, tempfile, unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT))

from factory.web_connector import extract_html, fetch_url
from factory.openapi_connector import build_request_url, call_openapi
from factory.research_cache import ResearchCache
from factory.image_queue import ImageQueue
from factory.image_adapters import LocalPlaceholderAdapter, OpenAIImageAdapter
from factory.deployment_gate import evaluate_deployment_gate

class V2028Tests(unittest.TestCase):
    def test_html_extraction(self):
        title,text=extract_html("<html><head><title>A</title><style>x</style></head><body><h1>Hello</h1><script>bad</script></body></html>")
        self.assertEqual(title,"A")
        self.assertIn("Hello",text)
        self.assertNotIn("bad",text)

    def test_blocked_domain(self):
        result=fetch_url("https://example.com/x",["gov.kr"])
        self.assertEqual(result["status"],"blocked_domain")

    def test_openapi_url(self):
        url=build_request_url("https://apis.data.go.kr/test",{"pageNo":1,"q":"전기"})
        self.assertIn("pageNo=1",url)
        self.assertIn("%EC%A0%84%EA%B8%B0",url)

    def test_openapi_missing_key(self):
        result=call_openapi("https://apis.data.go.kr/test",{},["apis.data.go.kr"],"MISSING_TEST_KEY")
        self.assertEqual(result["status"],"missing_api_key")

    def test_cache(self):
        with tempfile.TemporaryDirectory() as td:
            root=Path(td)
            cache=ResearchCache(root,ttl_seconds=60)
            cache.put("x",{"a":1})
            self.assertEqual(cache.get("x")["a"],1)

    def test_image_queue(self):
        with tempfile.TemporaryDirectory() as td:
            root=Path(td)
            queue=ImageQueue(root)
            job=queue.enqueue({"slug":"a"})
            self.assertEqual(queue.summary()["pending"],1)
            queue.complete(job["job_id"],["a.webp"])
            self.assertEqual(queue.summary()["completed"],1)

    def test_placeholder_adapter_truthful(self):
        with tempfile.TemporaryDirectory() as td:
            root=Path(td)
            result=LocalPlaceholderAdapter().generate(root,{"slug":"a"})
            self.assertEqual(result["status"],"placeholder_only")
            self.assertEqual(result["generated_files"],[])

    def test_deployment_gate_blocks_missing(self):
        with tempfile.TemporaryDirectory() as td:
            root=Path(td)
            report=evaluate_deployment_gate(root)
            self.assertFalse(report["pass"])
            self.assertIn("required_reports_present",report["blockers"])

if __name__=="__main__":
    unittest.main()
