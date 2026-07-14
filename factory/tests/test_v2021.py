import sys, tempfile, unittest, json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT))
from factory.adsense_audit import audit_article, audit_site
from factory.eeat import audit_eeat
from factory.indexability import audit_indexability

RULES={
  'minimum_article_chars':100,'minimum_internal_links':1,'article_pass_score':70,
  'minimum_article_pass_ratio':0.5,'site_pass_score':50,
  'forbidden_placeholders':['TODO']
}

GOOD='''<!doctype html><html lang="ko"><head><title>좋은 글</title><meta name="description" content="충분히 자세한 설명을 제공하는 메타 설명입니다. 사용자의 질문과 해결 방법을 정리합니다."><meta name="robots" content="index,follow"><link rel="canonical" href="https://savingio.com/articles/a.html"><script type="application/ld+json">{}</script></head><body><h1>좋은 글</h1><p>최종 업데이트</p><p>공식 근거와 출처를 확인합니다. ''' + ('내용 '*80) + '''</p><a href="/articles/">관련 글</a><table><tr><td>표</td></tr></table><section id="faq"><h2>FAQ</h2></section></body></html>'''

class V2021Tests(unittest.TestCase):
    def test_good_article(self):
        with tempfile.TemporaryDirectory() as td:
            root=Path(td); (root/'articles').mkdir(); p=root/'articles'/'a.html'; p.write_text(GOOD,encoding='utf-8')
            row=audit_article(p,root,RULES)
            self.assertTrue(row['pass'])
            self.assertEqual(row['policy_hits'],[])

    def test_thin_article(self):
        with tempfile.TemporaryDirectory() as td:
            root=Path(td); (root/'articles').mkdir(); p=root/'articles'/'a.html'; p.write_text('<title>x</title><h1>x</h1>',encoding='utf-8')
            row=audit_article(p,root,RULES)
            self.assertFalse(row['checks']['minimum_text'])

    def test_policy_risk(self):
        with tempfile.TemporaryDirectory() as td:
            root=Path(td); (root/'articles').mkdir(); p=root/'articles'/'a.html'; p.write_text(GOOD+' 카지노 도박 ',encoding='utf-8')
            row=audit_article(p,root,RULES)
            self.assertFalse(row['checks']['policy_safe'])

    def test_site_audit(self):
        with tempfile.TemporaryDirectory() as td:
            root=Path(td); (root/'articles').mkdir(); (root/'articles'/'a.html').write_text(GOOD,encoding='utf-8')
            for x in ['about.html','contact.html','privacy.html','terms.html','disclaimer.html','editorial-policy.html','index.html','404.html','robots.txt','sitemap.xml']:
                (root/x).write_text('x',encoding='utf-8')
            (root/'articles'/'index.html').write_text('x',encoding='utf-8')
            report=audit_site(root,RULES)
            self.assertEqual(report['article_count'],1)
            self.assertGreaterEqual(report['adsense_readiness_score'],50)

    def test_indexability_real_site(self):
        report=audit_indexability(ROOT)
        self.assertGreater(report['article_count'],100)

    def test_eeat_real_site(self):
        report=audit_eeat(ROOT)
        self.assertGreater(report['article_count'],100)

if __name__=='__main__': unittest.main()
