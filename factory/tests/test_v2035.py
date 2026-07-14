import json, os, sys, tempfile, unittest
from pathlib import Path
from unittest.mock import patch
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives import serialization
ROOT=Path(__file__).resolve().parents[2]; sys.path.insert(0,str(ROOT))
from factory.google_token_exchange import build_signed_assertion, exchange_access_token
from factory.article_optimization_executor import execute_actions
from factory.scheduler_installer import generate_scheduler_files

def service_account_json():
    key=rsa.generate_private_key(public_exponent=65537,key_size=2048)
    pem=key.private_bytes(serialization.Encoding.PEM,serialization.PrivateFormat.PKCS8,serialization.NoEncryption()).decode()
    return json.dumps({'client_email':'factory@example.iam.gserviceaccount.com','private_key':pem,'token_uri':'https://oauth2.googleapis.com/token'})
class V2035Tests(unittest.TestCase):
    def test_signed_assertion(self):
        with patch.dict(os.environ,{'GOOGLE_SERVICE_ACCOUNT_JSON':service_account_json()},clear=True):
            result=build_signed_assertion('scope'); self.assertEqual(result['assertion'].count('.'),2)
    def test_token_dry_run(self):
        with patch.dict(os.environ,{'GOOGLE_SERVICE_ACCOUNT_JSON':service_account_json()},clear=True):
            result=exchange_access_token('scope',execute=False); self.assertEqual(result['status'],'dry_run')
    def test_analytics_apply_real_backup(self):
        with tempfile.TemporaryDirectory() as td:
            root=Path(td); (root/'articles').mkdir(); article=root/'articles'/'a.html'; article.write_text('<html><head><meta name="description" content="설명"></head><body><main></main></body></html>',encoding='utf-8')
            base=root/'factory'/'output'/'analytics'; base.mkdir(parents=True); (base/'optimization_actions.json').write_text(json.dumps({'actions':[{'page':'/articles/a.html','action':'rewrite_title_meta','reason':'low_ctr'}]},ensure_ascii=False),encoding='utf-8')
            result=execute_actions(root,execute=True); self.assertEqual(result['completed'],1); self.assertTrue((root/'factory'/'backups'/'analytics-rework'/'articles'/'a.html').exists())
    def test_scheduler_files(self):
        with tempfile.TemporaryDirectory() as td:
            root=Path(td); result=generate_scheduler_files(root,4,30); self.assertTrue((root/result['windows_bat']).exists())
if __name__=='__main__': unittest.main()
