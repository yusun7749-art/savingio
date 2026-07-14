import json,sys,tempfile,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];sys.path.insert(0,str(ROOT))
from factory.department_handoff import next_department,build_handoff
from factory.department_gate import evaluate_department
from factory.cycle_dashboard import build_cycle_dashboard
from factory.auto_rework_engine import route_issues
class T(unittest.TestCase):
 def test_chain(self): self.assertEqual(next_department('planning'),'research');self.assertIsNone(next_department('revenue'))
 def test_packet(self): self.assertEqual(build_handoff('w','planning',{})['receiver'],'research')
 def test_gate(self): self.assertTrue(evaluate_department('planning',{'topic':'x','slug':'x','article_type':'general','category':'c','required_sections':[]},ROOT/'factory'/'config')['pass'])
 def test_dashboard(self):
  with tempfile.TemporaryDirectory() as td:
   r=Path(td);b=r/'factory'/'output';b.mkdir(parents=True);(b/'automation_cycle_report.json').write_text(json.dumps({'handoffs':[{'sender':'planning','receiver':'research','status':'ready','blockers':[]},{'sender':'research','receiver':'writing','status':'blocked','blockers':['x']}]}),encoding='utf-8');x=build_cycle_dashboard(r);self.assertEqual(x['ready_count'],1);self.assertEqual(x['blocked_count'],1)
 def test_route(self):
  with tempfile.TemporaryDirectory() as td:
   x=route_issues(Path(td),'w',['title_length','text_length']);self.assertEqual({i['department'] for i in x['items']},{'seo','writing'})
if __name__=='__main__':unittest.main()
