import json, sys, tempfile, unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT))

from factory.search_evidence import convert_search_results
from factory.evidence_merge import merge_evidence_sets
from factory.image_result_linker import register_image_results, inject_images_into_html
from factory.git_executor import selective_commit
from factory.cloudflare_deploy import deployment_readiness
from factory.publish_executor import execute_publication

class V2029Tests(unittest.TestCase):
    def test_search_to_evidence(self):
        rows=[
            {
                "title":"한국전력 전기요금 안내",
                "url":"https://kepco.co.kr/example",
                "snippet":"전기요금 적용 대상과 조건을 확인할 수 있습니다.",
                "published_at":"2026-01-01",
                "verified":True
            },
            {
                "title":"블로그 글",
                "url":"https://example.com/x",
                "snippet":"공식이 아닌 출처입니다."
            }
        ]
        result=convert_search_results(rows,ROOT/"factory"/"config")
        self.assertEqual(result["converted_count"],1)
        self.assertEqual(result["rejected_count"],1)
        self.assertTrue(result["evidence"][0]["official"])

    def test_evidence_merge(self):
        item={"url":"https://kepco.co.kr/a","claim":"전기요금 조건 확인","evidence_score":90,"official":True}
        result=merge_evidence_sets([[item],[item]])
        self.assertEqual(result["unique_count"],1)
        self.assertEqual(result["duplicate_count"],1)

    def test_register_images_and_inject(self):
        with tempfile.TemporaryDirectory() as td:
            root=Path(td)
            a=root/"a.webp"; b=root/"b.webp"
            a.write_bytes(b"RIFFxxxxWEBP")
            b.write_bytes(b"RIFFyyyyWEBP")
            manifest=register_image_results(root,"slug",[a,b],["hero","infographic"])
            self.assertTrue(manifest["ready"])
            html="<html><body><header></header><section id=\"next-action\"></section></body></html>"
            updated=inject_images_into_html(html,manifest)
            self.assertIn("data-factory-hero",updated)
            self.assertIn("data-factory-infographic",updated)

    def test_git_dry_run(self):
        with tempfile.TemporaryDirectory() as td:
            result=selective_commit(Path(td),["factory/a.py"],"test",push=True,dry_run=True)
            self.assertEqual(result["status"],"dry_run")
            flat=" ".join(" ".join(x) for x in result["plan"]["commands"])
            self.assertNotIn("git add .",flat)

    def test_cloudflare_readiness_shape(self):
        result=deployment_readiness(ROOT)
        self.assertEqual(result["provider"],"Cloudflare Pages")
        self.assertIn("git_auto_deploy_ready",result)

    def test_publish_blocks_without_gate_files(self):
        with tempfile.TemporaryDirectory() as td:
            root=Path(td)
            result=execute_publication(root,["a.html"],"test",dry_run=True)
            self.assertEqual(result["status"],"blocked")

if __name__=="__main__":
    unittest.main()
