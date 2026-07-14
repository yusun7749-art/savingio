
from pathlib import Path
import json
from datetime import datetime
DEPTS=["planning","research","writing","seo","image","qa","cms","deploy"]
def status():
    return {d:{"status":"ready","updated":datetime.utcnow().isoformat()} for d in DEPTS}
if __name__=="__main__":
    print(json.dumps(status(),indent=2))
