import json, tempfile, unittest
from pathlib import Path
from factory.planner import build_plan
from factory.researcher import build_research_package
from factory.evidence import validate_evidence_items
from factory.seo import build_seo
from factory.writer import generate_article
from factory.qa import evaluate
from factory.rewriter import repair_article
from factory.batch import load_topics

ROOT=Path(__file__).resolve().parents[2]; CONFIG=ROOT/'factory/config'

class FactoryV2017Tests(unittest.TestCase):
    def test_evidence_validation(self):
        r=validate_evidence_items([{'claim':'기준','source_name':'한국전력','url':'https://home.kepco.co.kr/a'}],CONFIG)
        self.assertTrue(r['items'][0]['verified']); self.assertGreaterEqual(r['score'],15)
    def test_invalid_evidence(self):
        r=validate_evidence_items([{'claim':'','source_name':'x','url':'bad'}],CONFIG)
        self.assertFalse(r['items'][0]['verified']); self.assertTrue(r['issues'])
    def test_writer_type_and_qa(self):
        plan=build_plan('전기요금 절약 방법',CONFIG); research=build_research_package(plan,CONFIG)
        seo=build_seo(plan,CONFIG); html=generate_article(plan,research,seo,[],CONFIG); qa=evaluate(html,plan,research,seo,CONFIG)
        self.assertTrue(qa['pass']); self.assertIn('data-factory-version="2.017"',html)
    def test_repair_loop(self):
        plan=build_plan('전기요금 절약 방법',CONFIG); research=build_research_package(plan,CONFIG); seo=build_seo(plan,CONFIG)
        html=generate_article(plan,research,seo,[],CONFIG).replace('href="/articles/"','href="#"').replace('href="/"','href="#"')
        qa=evaluate(html,plan,research,seo,CONFIG); fixed,revised,actions=repair_article(html,qa,plan,research,seo,CONFIG)
        self.assertGreaterEqual(revised['score'],qa['score'])
    def test_batch_topic_loader(self):
        with tempfile.TemporaryDirectory() as td:
            p=Path(td)/'topics.txt'; p.write_text('전기요금\n#주석\n전기요금\n수도요금\n',encoding='utf-8')
            self.assertEqual(load_topics(p),['전기요금','수도요금'])

if __name__=='__main__': unittest.main()
