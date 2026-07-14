import json,sys,tempfile,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]; sys.path.insert(0,str(ROOT))
from factory.planner import build_plan
from factory.researcher import build_research_package
from factory.seo import build_seo
from factory.catalog import scan_articles,related_links
from factory.writer import generate_article
from factory.qa import evaluate
from factory.git_engine import build_selective_commands
from factory.doctor import run_doctor
from factory.auditor import audit_file
class Tests(unittest.TestCase):
 @classmethod
 def setUpClass(cls): cls.cfg=ROOT/'factory/config'
 def test_plan_types(self):
  self.assertEqual(build_plan('전기요금 절약',self.cfg)['category'],'공과금')
  self.assertEqual(build_plan('부가세 신고 방법',self.cfg)['article_type'],'tax')
 def test_research_candidates(self): self.assertTrue(build_research_package(build_plan('전기요금 절약',self.cfg),self.cfg)['official_source_candidates'])
 def test_seo(self):
  x=build_seo(build_plan('전기요금 절약',self.cfg),self.cfg); self.assertTrue(x['canonical'].startswith('https://savingio.com/articles/')); self.assertIn('@type',x['schema'])
 def test_catalog(self): self.assertGreater(len(scan_articles(ROOT)),100)
 def test_article_qa(self):
  p=build_plan('전기요금 절약',self.cfg); r=build_research_package(p,self.cfg); s=build_seo(p,self.cfg); h=generate_article(p,r,s,related_links(p['topic'],scan_articles(ROOT)),self.cfg); q=evaluate(h,p,r,s,self.cfg); self.assertTrue(q['pass'],q); self.assertGreaterEqual(q['score'],95)
 def test_git_safe(self): self.assertNotIn('git add .','\n'.join(build_selective_commands(['a','b'],'m')))
 def test_doctor(self): self.assertTrue(run_doctor(ROOT)['pass'])
 def test_audit(self): self.assertIn('score',audit_file(ROOT/'articles/index.html'))
if __name__=='__main__': unittest.main()
