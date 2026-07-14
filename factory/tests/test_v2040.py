import json, os, sys, tempfile, unittest
from pathlib import Path
from unittest.mock import patch

ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT))

from factory.credential_onboarding import build_credential_checklist, write_env_example, validate_service_account_json
from factory.connector_verification_receipt import append_verification_receipt, verify_history
from factory.production_activation_gate import evaluate_production_activation
from factory.external_verification_center import run_external_verification_center

class V2040Tests(unittest.TestCase):
    def test_credential_checklist(self):
        with patch.dict(os.environ,{},clear=True):
            result=build_credential_checklist(ROOT)
            self.assertGreater(result["required_count"],0)
            self.assertGreater(len(result["missing_required"]),0)

    def test_env_template(self):
        with tempfile.TemporaryDirectory() as td:
            root=Path(td)
            (root/"factory"/"config").mkdir(parents=True)
            (root/"factory"/"config"/"external_integration_registry.json").write_text(
                (ROOT/"factory"/"config"/"external_integration_registry.json").read_text(encoding="utf-8"),
                encoding="utf-8"
            )
            result=write_env_example(root)
            self.assertTrue((root/result["path"]).exists())

    def test_service_account_validation(self):
        with patch.dict(os.environ,{"GOOGLE_SERVICE_ACCOUNT_JSON":json.dumps({
            "client_email":"x@example.com","private_key":"KEY","token_uri":"https://oauth2.googleapis.com/token"
        })},clear=True):
            result=validate_service_account_json()
            self.assertTrue(result["valid"])

    def test_receipt_history(self):
        with tempfile.TemporaryDirectory() as td:
            root=Path(td)
            append_verification_receipt(root,{"execute":False,"passed_count":1,"total_count":2,"statuses":[]})
            append_verification_receipt(root,{"execute":False,"passed_count":2,"total_count":2,"statuses":[]})
            result=verify_history(root)
            self.assertTrue(result["pass"])
            self.assertEqual(result["count"],2)

    def test_activation_blocks_without_credentials(self):
        with tempfile.TemporaryDirectory() as td:
            root=Path(td)
            (root/"factory"/"config").mkdir(parents=True)
            (root/"factory"/"config"/"external_integration_registry.json").write_text(
                (ROOT/"factory"/"config"/"external_integration_registry.json").read_text(encoding="utf-8"),
                encoding="utf-8"
            )
            with patch.dict(os.environ,{},clear=True):
                result=evaluate_production_activation(root)
                self.assertFalse(result["pass"])
                self.assertIn("required_credentials_configured",result["blockers"])

if __name__=="__main__":
    unittest.main()
