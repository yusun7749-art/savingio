import json,sys,tempfile,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]; sys.path.insert(0,str(ROOT))
from factory.regression_manifest import build_regression_manifest,compare_regression_manifest
from factory.final_release_manifest import build_final_release_manifest
from factory.master_checklist import build_master_checklist
class T(unittest.TestCase):
 def test_checklist(self): self.assertGreaterEqual(build_master_checklist(ROOT)["completed_count"],10)
 def test_regression(self): self.assertGreater(build_regression_manifest(ROOT)["entry_count"],0)
 def test_compare(self):
  with tempfile.TemporaryDirectory() as td:
   r=Path(td); (r/"index.html").write_text("x"); b=build_regression_manifest(r); p=r/"b.json"; p.write_text(json.dumps(b)); self.assertTrue(compare_regression_manifest(r,p)["pass"])
 def test_manifest(self):
  with tempfile.TemporaryDirectory() as td:
   r=Path(td); (r/"factory").mkdir(); (r/"factory"/"x.py").write_text("x=1"); m=build_final_release_manifest(r,"x"); self.assertEqual(m["factory_python_file_count"],1)
if __name__=="__main__": unittest.main()
