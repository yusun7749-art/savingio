import sys, tempfile, unittest, json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

from factory.state_db import add_queue_item, fetch_next_queue_item, update_queue_item, get_state
from factory.orchestrator import Orchestrator
from factory.incremental import content_hash, diff_catalog
from factory.dna_versioning import checksum_payload
from factory.doctor import run_doctor

class FactoryV2019Tests(unittest.TestCase):
    def test_state_queue(self):
        with tempfile.TemporaryDirectory() as td:
            db = Path(td) / "state.sqlite3"
            item_id = add_queue_item(db, "전기요금 절약", 90)
            item = fetch_next_queue_item(db)
            self.assertEqual(item["id"], item_id)
            self.assertEqual(item["status"], "pending")
            update_queue_item(db, item_id, "completed")
            self.assertEqual(get_state(db)["queue"]["completed"], 1)

    def test_incremental_diff(self):
        prev = [{"path":"a.html","hash":"1"}]
        curr = [{"path":"a.html","hash":"2"},{"path":"b.html","hash":"3"}]
        diff = diff_catalog(prev, curr)
        self.assertEqual(len(diff["changed"]), 1)
        self.assertEqual(len(diff["added"]), 1)

    def test_hash_stable(self):
        self.assertEqual(content_hash("abc"), content_hash("abc"))

    def test_dna_checksum_stable(self):
        a = checksum_payload({"b":2,"a":1})
        b = checksum_payload({"a":1,"b":2})
        self.assertEqual(a, b)

    def test_doctor(self):
        report = run_doctor(ROOT)
        self.assertTrue(report["pass"])
        self.assertGreaterEqual(report["module_count"], 15)

if __name__ == "__main__":
    unittest.main()
