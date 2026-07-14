import json, sys, tempfile, unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT))

from factory.source_registry import load_source_registry, match_sources, trust_for_url, build_query_plan
from factory.research_collector import normalise_evidence, load_evidence_files
from factory.research_qa import evaluate_research
from factory.research_department import run_research_department
from factory.planner import build_plan

class ResearchV2026Tests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.config=ROOT/"factory"/"config"
        cls.registry=load_source_registry(cls.config)

    def test_source_match(self):
        rows=match_sources("전기요금 감면 신청",self.registry)
        domains={x["domain"] for x in rows}
        self.assertIn("kepco.co.kr",domains)
        self.assertIn("law.go.kr",domains)

    def test_trust_subdomain(self):
        result=trust_for_url("https://home.kepco.co.kr/example",self.registry)
        self.assertTrue(result["official"])
        self.assertGreaterEqual(result["trust_score"],90)

    def test_evidence_normalization(self):
        item=normalise_evidence({
            "source_name":"한국전력",
            "url":"https://kepco.co.kr/example",
            "claim":"전기요금 관련 공식 조건을 확인할 수 있습니다.",
            "excerpt":"공식 안내 페이지에서 적용 대상과 세부 조건을 확인할 수 있습니다.",
            "published_at":"2026-01-01",
            "verified":True
        },self.registry)
        self.assertTrue(item["verified"])
        self.assertTrue(item["official"])
        self.assertGreaterEqual(item["evidence_score"],80)

    def test_evidence_dedupe(self):
        with tempfile.TemporaryDirectory() as td:
            path=Path(td)/"e.json"
            item={
                "source_name":"한국전력","url":"https://kepco.co.kr/a",
                "claim":"공식 조건을 확인해야 합니다.",
                "excerpt":"공식 문서에서 대상과 조건을 구체적으로 확인합니다.",
                "published_at":"2026-01-01","verified":True
            }
            path.write_text(json.dumps({"evidence":[item,item]},ensure_ascii=False),encoding="utf-8")
            result=load_evidence_files([path],self.registry)
            self.assertEqual(result["unique_count"],1)
            self.assertEqual(result["duplicate_count"],1)

    def test_research_department_without_evidence(self):
        plan=build_plan("전기요금 절약",self.config)
        result=run_research_department(plan,ROOT,[])
        self.assertFalse(result["ready_for_publish"])
        self.assertGreaterEqual(len(result["query_plan"]),4)
        self.assertEqual(result["research_status"],"research_rework_required")

    def test_research_department_with_evidence(self):
        with tempfile.TemporaryDirectory() as td:
            path=Path(td)/"e.json"
            items=[
              {
                "source_name":"한국전력","url":"https://kepco.co.kr/a",
                "claim":"전기요금 적용 조건은 공식 안내에서 확인합니다.",
                "excerpt":"대상, 요금제, 신청 조건과 적용 시점을 공식 문서에서 확인합니다.",
                "published_at":"2026-01-01","verified":True
              },
              {
                "source_name":"국가법령정보센터","url":"https://law.go.kr/b",
                "claim":"관련 법령과 시행 기준을 확인해야 합니다.",
                "excerpt":"법령 원문과 시행일을 기준으로 적용 여부와 예외 조건을 검토합니다.",
                "published_at":"2026-02-01","verified":True
              }
            ]
            path.write_text(json.dumps({"evidence":items},ensure_ascii=False),encoding="utf-8")
            plan=build_plan("전기요금 절약",self.config)
            result=run_research_department(plan,ROOT,[path])
            self.assertTrue(result["ready_for_publish"])
            self.assertTrue(result["qa"]["pass"])
            self.assertEqual(result["verified_evidence_count"],2)

if __name__=="__main__":
    unittest.main()
