import json,sys,tempfile,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]; sys.path.insert(0,str(ROOT))
from factory.adsense_manager import *
class T(unittest.TestCase):
 def make(self,td):
  r=Path(td); (r/"factory"/"config").mkdir(parents=True); (r/"factory"/"config"/"adsense_identity.json").write_text((ROOT/"factory"/"config"/"adsense_identity.json").read_text()); return r
 def test_identity(self):
  i=load_identity(ROOT); self.assertEqual(i["adsense_client"],"ca-"+i["publisher_id"])
 def test_scan_repair(self):
  with tempfile.TemporaryDirectory() as td:
   r=self.make(td); w="pub-"+"1"*16; (r/"index.html").write_text(f'<html><head><script src="?client=ca-{w}"></script></head></html>'); (r/"ads.txt").write_text(w)
   self.assertFalse(scan_publisher_ids(r)["pass"]); self.assertGreaterEqual(repair_publisher_ids(r)["changed_count"],2); self.assertTrue(scan_publisher_ids(r)["pass"])
 def test_ads_txt(self):
  with tempfile.TemporaryDirectory() as td:
   r=self.make(td); self.assertTrue(ensure_ads_txt(r,True)["valid"])
 def test_html(self):
  i=load_identity(ROOT); h=ensure_html_adsense_identity("<html><head></head></html>",i); self.assertIn(i["adsense_client"],h)
 def test_full_lock(self):
  with tempfile.TemporaryDirectory() as td:
   r=self.make(td); (r/"index.html").write_text("<html><head></head></html>"); self.assertTrue(run_adsense_lock(r,True)["pass"])
if __name__=="__main__":unittest.main()

class DeploymentGateAdSenseTests(unittest.TestCase):
 def test_gate_contains_adsense_lock(self):
  from factory.deployment_gate import evaluate_deployment_gate
  with tempfile.TemporaryDirectory() as td:
   r=Path(td); (r/'factory'/'config').mkdir(parents=True); (r/'factory'/'output'/'research').mkdir(parents=True)
   (r/'factory'/'config'/'adsense_identity.json').write_text((ROOT/'factory'/'config'/'adsense_identity.json').read_text())
   i=load_identity(r); (r/'index.html').write_text(ensure_html_adsense_identity('<html><head></head></html>',i)); ensure_ads_txt(r,True)
   (r/'factory'/'output'/'qa_report.json').write_text(json.dumps({'pass':True}))
   (r/'factory'/'output'/'research'/'research_qa.json').write_text(json.dumps({'pass':True}))
   (r/'factory'/'output'/'approval_request.json').write_text(json.dumps({'status':'approved'}))
   (r/'factory'/'output'/'image_manifest.json').write_text(json.dumps({'ready':True}))
   result=evaluate_deployment_gate(r)
   self.assertTrue(result['checks']['adsense_lock_pass'])
   self.assertIn('adsense_lock',result)
