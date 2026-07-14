import sys, unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))
from factory.planner import build_plan
from factory.researcher import build_research_package
from factory.seo import build_seo
from factory.writer import generate_article
from factory.qa import evaluate
from factory.git_engine import build_selective_commands

class FactoryTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.config = ROOT / "factory" / "config"

    def test_plan(self):
        plan = build_plan("전기요금 절약", self.config)
        self.assertEqual(plan["category"], "공과금")
        self.assertTrue(plan["slug"])

    def test_article_and_qa(self):
        plan = build_plan("전기요금 절약", self.config)
        research = build_research_package(plan, self.config)
        seo = build_seo(plan, self.config)
        html = generate_article(plan, research, seo, self.config)
        report = evaluate(html, plan, research, seo, self.config)
        self.assertTrue(report["pass"])
        self.assertGreaterEqual(report["score"], 95)

    def test_selective_git(self):
        commands = build_selective_commands(["factory/output/a.json", "articles/a.html"], "test")
        self.assertNotIn("git add .", "\n".join(commands))
        self.assertIn("git add --", commands[0])

if __name__ == "__main__":
    unittest.main()
