#!/usr/bin/env python3
from pathlib import Path
import json
# Article Engine source of truth: data/article-configs.json
# Generated pages are written to articles/<slug>.html.
# Use tools/build-articles.py after adding or editing a config.
print("Article configs:", len(json.loads(Path("data/article-configs.json").read_text(encoding="utf-8"))))
print("Run the repository build script supplied with the template package.")
