import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from factory.cloudflare_deploy_verify import verify_latest_deployment


class V2051CloudflareVerifyTests(unittest.TestCase):
    def test_dry_run_still_blocks_without_cloudflare_env(self):
        with tempfile.TemporaryDirectory() as td, patch.dict(os.environ, {}, clear=True):
            result = verify_latest_deployment(Path(td), execute=False)
            self.assertEqual(result["status"], "blocked")
            self.assertFalse(result["pass"])

    def test_execute_uses_live_site_when_env_missing(self):
        healthy = {"base_url": "https://savingio.com", "pass": True, "results": []}
        with tempfile.TemporaryDirectory() as td, patch.dict(os.environ, {}, clear=True):
            with patch("factory.cloudflare_deploy_verify.check_site", return_value=healthy):
                result = verify_latest_deployment(
                    Path(td), execute=True, fallback_attempts=1, fallback_interval_seconds=0
                )
        self.assertEqual(result["status"], "success")
        self.assertEqual(result["verification"], "live_site_fallback")
        self.assertTrue(result["pass"])

    def test_api_failure_can_be_recovered_by_live_site(self):
        healthy = {"base_url": "https://savingio.com", "pass": True, "results": []}
        fake_client = type(
            "Client",
            (),
            {
                "project_name": "savingio",
                "wait_for_latest": lambda self: {"status": "timeout", "history": []},
            },
        )()
        with tempfile.TemporaryDirectory() as td:
            with patch("factory.cloudflare_deploy_verify.CloudflarePagesClient.from_env", return_value=fake_client):
                with patch("factory.cloudflare_deploy_verify.check_site", return_value=healthy):
                    result = verify_latest_deployment(
                        Path(td), execute=True, fallback_attempts=1, fallback_interval_seconds=0
                    )
        self.assertEqual(result["status"], "success")
        self.assertEqual(result["reason"], "cloudflare_api_timeout")
        self.assertIn("cloudflare_api_result", result)

    def test_live_site_failure_remains_failure(self):
        unhealthy = {"base_url": "https://savingio.com", "pass": False, "results": []}
        with tempfile.TemporaryDirectory() as td, patch.dict(os.environ, {}, clear=True):
            with patch("factory.cloudflare_deploy_verify.check_site", return_value=unhealthy):
                result = verify_latest_deployment(
                    Path(td), execute=True, fallback_attempts=2, fallback_interval_seconds=0
                )
        self.assertEqual(result["status"], "failure")
        self.assertFalse(result["pass"])
        self.assertEqual(len(result["history"]), 2)


if __name__ == "__main__":
    unittest.main()
