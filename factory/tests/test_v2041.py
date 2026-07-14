import json,sys,tempfile,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT))
from factory.calculator_intent_engine import analyze_calculator_intent
from factory.calculator_matcher import match_article_to_calculators
from factory.calculator_generation_request import create_generation_request
from factory.calculator_solution_package import inject_calculators, calculator_html
from factory.calculator_cms_registry import register_article_calculators
from factory.calculator_qa import validate_registry
from factory.calculator_hq import run_calculator_hq

class V2041Tests(unittest.TestCase):
    def test_intent_match(self):
        result=analyze_calculator_intent("연봉 5000만원 실수령액",ROOT/"factory"/"config")
        self.assertTrue(result["calculator_required"])
        self.assertGreater(result["matched_count"],0)
        self.assertEqual(result["matches"][0]["calculator_id"],"salary-net-pay")

    def test_missing_creates_request(self):
        with tempfile.TemporaryDirectory() as td:
            root=Path(td)
            request=create_generation_request("반려동물 나이 계산", "pet-age", root)
            self.assertEqual(request["status"],"requested")
            self.assertTrue(list((root/"factory"/"output"/"calculator"/"requests").glob("*.json")))

    def test_inject_idempotent(self):
        package={"calculators":[{"calculator_id":"x","title":"테스트 계산기","url":"/calculators/x.html"}]}
        html='<main><section id="next-action"><h2>다음</h2></section></main>'
        first=inject_calculators(html,package)
        second=inject_calculators(first,package)
        self.assertIn("factory-calculator-package",first)
        self.assertEqual(first,second)

    def test_cms_registry(self):
        with tempfile.TemporaryDirectory() as td:
            root=Path(td)
            package={"slug":"a","article_url":"/articles/a.html","status":"linked","calculators":[{"calculator_id":"x","url":"/calculators/x.html"}]}
            result=register_article_calculators(root,package)
            self.assertTrue(result["registered"])
            self.assertEqual(result["link_count"],1)

    def test_registry_qa(self):
        registry=json.loads((ROOT/"factory"/"config"/"calculator_registry.json").read_text(encoding="utf-8"))
        result=validate_registry(registry["calculators"])
        self.assertTrue(result["pass"])
        self.assertEqual(result["calculator_count"],6)

    def test_hq_generation_request(self):
        with tempfile.TemporaryDirectory() as td:
            root=Path(td)
            (root/"factory"/"config").mkdir(parents=True)
            for name in ["calculator_registry.json"]:
                (root/"factory"/"config"/name).write_text((ROOT/"factory"/"config"/name).read_text(encoding="utf-8"),encoding="utf-8")
            result=run_calculator_hq("전기요금 계산","electricity-guide",root)
            self.assertEqual(result["status"],"completed")
            self.assertEqual(result["package"]["status"],"requested")
            self.assertIsNotNone(result["package"]["generation_request"])

if __name__=="__main__":
    unittest.main()
