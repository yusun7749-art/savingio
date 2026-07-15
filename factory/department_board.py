from pathlib import Path
import json
from datetime import UTC, datetime

DEPTS = ["planning", "research", "writing", "seo", "image", "qa", "cms", "deploy"]

def status():
    updated = datetime.now(UTC).isoformat()
    return {department: {"status": "ready", "updated": updated} for department in DEPTS}

if __name__ == "__main__":
    print(json.dumps(status(), indent=2))
