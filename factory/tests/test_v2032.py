import json, os, sys, tempfile, unittest
from pathlib import Path
from unittest.mock import patch

ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT))

from factory.cloudflare_health_check import check_site
from factory.government_api_adapters import list_services
from factory.image_provider_result import register_provider_result
from factory.image_queue import ImageQueue
from factory.wordpress_release_plan import build_wordpress_release_plan
from factory.research_ingestion_pipeline import ingest_search_and_evidence

class V2032Tests(unittest.TestCase):
    def test_openapi_services_list(self):
        rows=list_services(ROOT/"factory"/"config")
        self.assertTrue(any(x["name"]=="data-go-kr-generic" for x in rows))

    def test_site_health_error_shape(self):
        result=check_site("http://127.0.0.1:9",["/"])
        self.assertFalse(result["pass"])
        self.assertEqual(len(result["results"]),1)

    def test_image_provider_result(self):
        with tempfile.TemporaryDirectory() as td:
            root=Path(td)
            queue=ImageQueue(root)
            job=queue.enqueue({"slug":"a"})
            a=root/"a.webp"; b=root/"b.webp"
            a.write_bytes(b"RIFFaaaaWEBP")
            b.write_bytes(b"RIFFbbbbWEBP")
            result=register_provider_result(root,job["job_id"],"a",[a,b],["hero","infographic"])
            self.assertEqual(result["status"],"completed")
            self.assertEqual(queue.summary()["completed"],1)

    def test_research_ingestion(self):
        with tempfile.TemporaryDirectory() as td:
            root=Path(td)
            (root/"factory"/"config").mkdir(parents=True)
            # copy required configs
            for name in ["source_registry.json","research_quality_rules.json"]:
                (root/"factory"/"config"/name).write_text(
                    (ROOT/"factory"/"config"/name).read_text(encoding="utf-8"),
                    encoding="utf-8"
                )
            plan={"topic":"전기요금","article_type":"general","category":"생활","required_sections":[],"target_chars":3000}
            rows=[{
                "title":"한국전력 안내","url":"https://kepco.co.kr/a",
                "snippet":"전기요금 조건과 신청 기준을 확인할 수 있습니다.",
                "published_at":"2026-01-01","verified":True
            }]
            result=ingest_search_and_evidence(plan,rows,[],root)
            self.assertEqual(result["converted"]["converted_count"],1)
            self.assertEqual(result["merged"]["unique_count"],1)

if __name__=="__main__":
    unittest.main()
