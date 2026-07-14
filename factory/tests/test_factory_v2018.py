import json,sys,tempfile,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]; sys.path.insert(0,str(ROOT))
from factory.state import load_state,enqueue,approve
from factory.template_guard import snapshot,verify
from factory.auditor import audit_file
from factory.backlog import build_backlog
from factory.researcher import build_research_package
from factory.planner import build_plan
from factory.doctor import run_doctor

class V2018Tests(unittest.TestCase):
    def test_research_no_evidence_safe(self):
        p=build_plan('전기요금 절약',ROOT/'factory/config'); r=build_research_package(p,ROOT/'factory/config')
        self.assertFalse(r['ready_for_publish']); self.assertEqual(r['research_status'],'verification_required')
    def test_state_queue_approval(self):
        with tempfile.TemporaryDirectory() as td:
            pr=Path(td); (pr/'factory/output').mkdir(parents=True)
            s=enqueue(pr,[{'key':'a.html','type':'renewal'}]); self.assertEqual(len(s['queue']),1)
            s=approve(pr,'a.html','ok'); self.assertTrue(s['approvals']['a.html']['approved'])
    def test_ui_lock(self):
        snap=snapshot(ROOT,['index.html']); self.assertTrue(verify(ROOT,snap)['pass'])
    def test_audit_and_backlog(self):
        sample=next((ROOT/'articles').glob('*.html')); row=audit_file(sample); self.assertIn('risk',row)
        backlog=build_backlog({'results':[row]}); self.assertIn('summary',backlog)
    def test_doctor(self):
        self.assertTrue(run_doctor(ROOT)['pass'])
if __name__=='__main__': unittest.main()
