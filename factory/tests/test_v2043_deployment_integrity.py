import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

from factory.adsense_manager import ensure_ads_txt, ensure_html_adsense_identity, load_identity
from factory.deployment_integrity import verify_deployment_integrity
from factory.deployment_gate import evaluate_deployment_gate
from factory.publication import publish_approved


class DeploymentIntegrityTests(unittest.TestCase):
    def make_root(self, td: str) -> Path:
        root = Path(td)
        (root / "factory" / "config").mkdir(parents=True)
        (root / "factory" / "output" / "research").mkdir(parents=True)
        (root / "factory" / "output" / "staging" / "sample").mkdir(parents=True)
        identity_source = ROOT / "factory" / "config" / "adsense_identity.json"
        (root / "factory" / "config" / "adsense_identity.json").write_text(
            identity_source.read_text(encoding="utf-8"), encoding="utf-8"
        )
        identity = load_identity(root)
        (root / "index.html").write_text(
            ensure_html_adsense_identity("<html><head></head></html>", identity),
            encoding="utf-8",
        )
        ensure_ads_txt(root, True)
        for rel in (
            "factory/adsense_manager.py",
            "factory/pipeline.py",
            "factory/publication.py",
            "factory/deployment_gate.py",
            "factory/deploy.py",
        ):
            path = root / rel
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text("# fixture\n", encoding="utf-8")
        return root

    def test_integrity_passes_with_doctor_and_lock(self):
        with tempfile.TemporaryDirectory() as td:
            root = self.make_root(td)
            with patch("factory.deployment_integrity.run_doctor", return_value={"pass": True, "checks": []}):
                report = verify_deployment_integrity(root)
            self.assertTrue(report["pass"])
            self.assertTrue(report["checks"]["ads_txt_exact"])
            self.assertEqual(report["official_publisher_id"], "pub-7605193583747751")

    def test_integrity_blocks_wrong_publisher(self):
        with tempfile.TemporaryDirectory() as td:
            root = self.make_root(td)
            wrong = "pub-" + "1" * 16
            (root / "extra.html").write_text(wrong, encoding="utf-8")
            with patch("factory.deployment_integrity.run_doctor", return_value={"pass": True, "checks": []}):
                report = verify_deployment_integrity(root, repair=False)
            self.assertFalse(report["pass"])
            self.assertIn("publisher_lock_pass", report["blockers"])

    def test_gate_runs_integrity_before_release_checks(self):
        with tempfile.TemporaryDirectory() as td:
            root = self.make_root(td)
            (root / "factory" / "output" / "qa_report.json").write_text(json.dumps({"pass": True}))
            (root / "factory" / "output" / "research" / "research_qa.json").write_text(json.dumps({"pass": True}))
            (root / "factory" / "output" / "approval_request.json").write_text(json.dumps({"status": "approved"}))
            (root / "factory" / "output" / "image_manifest.json").write_text(json.dumps({"ready": True}))
            with patch("factory.deployment_integrity.run_doctor", return_value={"pass": True, "checks": []}):
                gate = evaluate_deployment_gate(root)
            self.assertTrue(gate["pass"])
            self.assertTrue(gate["checks"]["deployment_integrity_pass"])
            self.assertIn("integrity", gate)

    def test_publish_approved_injects_official_client(self):
        with tempfile.TemporaryDirectory() as td:
            root = self.make_root(td)
            stage = root / "factory" / "output" / "staging" / "sample"
            article = stage / "article.html"
            article.write_text("<html><head></head><body>sample</body></html>", encoding="utf-8")
            manifest = {
                "status": "approved",
                "approval_token": "token",
                "ready_for_publish": True,
                "duplicate_blocked": False,
                "article_path": "factory/output/staging/sample/article.html",
            }
            (stage / "manifest.json").write_text(json.dumps(manifest), encoding="utf-8")
            result = publish_approved(root, "sample", "token")
            html = (root / "articles" / "sample.html").read_text(encoding="utf-8")
            self.assertIn("ca-pub-7605193583747751", html)
            self.assertTrue(result["publisher_lock"]["post"]["pass"])


if __name__ == "__main__":
    unittest.main()
