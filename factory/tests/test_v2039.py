import json,sys,tempfile,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT))
from factory.operations_snapshot import build_operations_snapshot
from factory.incident_detector import detect_incidents
from factory.recovery_planner import build_recovery_plan
from factory.retry_policy import decide_retry
from factory.operations_center import run_operations_center

class V2039Tests(unittest.TestCase):
    def test_retry_policy(self):
        self.assertTrue(decide_retry("timeout",1,3)["retry"])
        self.assertFalse(decide_retry("timeout",3,3)["retry"])
        self.assertFalse(decide_retry("failed",1,3)["retry"])

    def test_snapshot_and_incident(self):
        with tempfile.TemporaryDirectory() as td:
            root=Path(td)
            out=root/"factory"/"output"
            out.mkdir(parents=True)
            (out/"approved_republish_report.json").write_text(json.dumps({"status":"failed_verification"}),encoding="utf-8")
            snapshot=build_operations_snapshot(root)
            self.assertGreaterEqual(snapshot["attention_count"],1)
            incidents=detect_incidents(root)
            self.assertGreaterEqual(incidents["critical_count"],1)

    def test_recovery_plan(self):
        with tempfile.TemporaryDirectory() as td:
            root=Path(td)
            out=root/"factory"/"output"
            out.mkdir(parents=True)
            (out/"incidents.json").write_text(json.dumps({"incidents":[
                {"incident_id":"x","source":"cloudflare_monitor","severity":"high"}
            ]}),encoding="utf-8")
            plan=build_recovery_plan(root)
            self.assertEqual(plan["plan_count"],1)
            self.assertGreaterEqual(len(plan["plans"][0]["steps"]),3)

    def test_operations_center(self):
        with tempfile.TemporaryDirectory() as td:
            root=Path(td)
            (root/"factory"/"output").mkdir(parents=True)
            result=run_operations_center(root)
            self.assertEqual(result["status"],"completed")
            self.assertIn("snapshot",result)
            self.assertIn("incidents",result)

if __name__=="__main__":
    unittest.main()
