import os,sys,tempfile,unittest
from pathlib import Path
from unittest.mock import patch
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT))
from factory.wordpress_connector import WordPressConnector
from factory.wordpress_publisher import publish_to_wordpress
from factory.cloudflare_pages_client import CloudflarePagesClient
from factory.cloudflare_deploy_verify import verify_latest_deployment
from factory.service_readiness import build_service_readiness
class V2030Tests(unittest.TestCase):
    def test_wordpress_auth(self):
        self.assertTrue(WordPressConnector('https://x','u','p')._auth_header().startswith('Basic '))
    def test_wordpress_missing_env(self):
        with patch.dict(os.environ,{},clear=True):
            with self.assertRaises(RuntimeError): WordPressConnector.from_env()
    def test_wordpress_gate_blocks(self):
        with tempfile.TemporaryDirectory() as td:
            self.assertEqual(publish_to_wordpress(Path(td))['status'],'blocked')
    def test_cloudflare_missing_env(self):
        with patch.dict(os.environ,{},clear=True):
            with self.assertRaises(RuntimeError): CloudflarePagesClient.from_env()
    def test_cloudflare_verify_blocks(self):
        with tempfile.TemporaryDirectory() as td:
            with patch.dict(os.environ,{},clear=True):
                self.assertEqual(verify_latest_deployment(Path(td))['status'],'blocked')
    def test_service_readiness(self):
        with patch.dict(os.environ,{},clear=True):
            r=build_service_readiness(ROOT)
            self.assertEqual(r['total_count'],4)
            self.assertIn('wordpress',r['services'])
if __name__=='__main__': unittest.main()
