import json, sys, tempfile, unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT))
from factory.revenue_html_rewriter import rewrite_article
from factory.revenue_qa_recheck import extract_context
from factory.revenue_cms_update import append_rework_history
from factory.revenue_rework_pipeline import run_revenue_rework
BODY="충분한 설명입니다. "*160
GOOD_HTML='<!doctype html><html lang="ko"><head><title>전기요금 절약 가이드</title><meta name="description" content="전기요금 절약 방법과 적용 조건, 확인 순서, 주의사항을 실제 생활 기준으로 자세히 정리했습니다."><meta name="robots" content="index,follow"><link rel="canonical" href="https://savingio.com/articles/a.html"><script type="application/ld+json">{}</script></head><body><main><h1>전기요금 절약 가이드</h1><section id="three-second-summary"><h2>요약</h2><p>'+BODY+'</p></section><section id="situation-choice"><h2>상황</h2><a href="/articles/">목록</a><a href="/about.html">소개</a><a href="/contact.html">문의</a></section><section id="conclusion"><h2>결론</h2></section><section id="causes"><h2>원인</h2></section><section id="condition-branches"><h2>조건</h2></section><section id="action-steps"><h2>순서</h2></section><section id="case"><h2>사례</h2></section><section id="comparison-table"><h2>표</h2><table><tr><td>조건</td></tr></table></section><section id="faq"><h2>FAQ</h2><h3>질문1</h3><h3>질문2</h3><h3>질문3</h3></section><section id="next-action"><h2>다음</h2></section><section id="internal-links"><h2>관련글</h2></section><section id="official-evidence"><h2>근거</h2></section><section id="updated"><h2>업데이트</h2></section></main></body></html>'
class V2037BTests(unittest.TestCase):
    def test_rewriter_dry_run(self):
        with tempfile.TemporaryDirectory() as td:
            root=Path(td); (root/"articles").mkdir(); article=root/"articles"/"a.html"; article.write_text(GOOD_HTML,encoding="utf-8")
            result=rewrite_article(root,{"page":"/articles/a.html","action":"rewrite_title_meta"},execute=False)
            self.assertEqual(result["status"],"dry_run")
    def test_rewriter_execute_backup(self):
        with tempfile.TemporaryDirectory() as td:
            root=Path(td); (root/"articles").mkdir(); article=root/"articles"/"a.html"; article.write_text(GOOD_HTML,encoding="utf-8")
            result=rewrite_article(root,{"page":"/articles/a.html","action":"review_ad_visibility"},execute=True)
            self.assertEqual(result["status"],"completed"); self.assertTrue((root/result["backup"]).exists())
    def test_extract_context(self):
        with tempfile.TemporaryDirectory() as td:
            root=Path(td); article=root/"a.html"; article.write_text(GOOD_HTML,encoding="utf-8")
            plan,research,seo=extract_context(GOOD_HTML,article,root); self.assertEqual(seo["slug"],"a"); self.assertTrue(research["ready_for_publish"])
    def test_pipeline_execute_and_qa(self):
        with tempfile.TemporaryDirectory() as td:
            root=Path(td); (root/"articles").mkdir(); article=root/"articles"/"a.html"; article.write_text(GOOD_HTML,encoding="utf-8")
            (root/"factory"/"config").mkdir(parents=True); (root/"factory"/"config"/"qa_rules.json").write_text((ROOT/"factory"/"config"/"qa_rules.json").read_text(encoding="utf-8"),encoding="utf-8")
            actions=root/"actions.json"; actions.write_text(json.dumps({"actions":[{"page":"/articles/a.html","action":"review_ad_layout_and_intent","reason":"low_rpm"}]}),encoding="utf-8")
            result=run_revenue_rework(root,actions,execute=True); self.assertEqual(result["completed"],1); self.assertEqual(result["qa_passed"],1)
    def test_history(self):
        with tempfile.TemporaryDirectory() as td:
            self.assertEqual(append_rework_history(Path(td),{"x":1})["history_count"],1)
if __name__=="__main__": unittest.main()
