import json
import re
import subprocess
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]


class PublicRuntimeContractTests(unittest.TestCase):
    def test_generated_data_is_parseable_before_deployment(self):
        brain = json.loads((ROOT / "data/savingio-brain-data.json").read_text(encoding="utf-8"))
        search = json.loads((ROOT / "data/savingio-search-index.json").read_text(encoding="utf-8"))
        self.assertIsInstance(brain.get("tree"), dict)
        self.assertEqual(search["count"], len(search["items"]))
        for path in (
            ROOT / "data/savingio-brain-data.js",
            ROOT / "js/savingio-search-core.js",
            ROOT / "js/savingio-brain-navigation.js",
        ):
            subprocess.run(["node", "--check", str(path)], check=True)

    def test_every_indexable_article_has_content_and_shared_brain(self):
        failures = []
        for page in sorted((ROOT / "articles").glob("*.html")):
            if page.name == "index.html":
                continue
            text = page.read_text(encoding="utf-8")
            if re.search(r'<meta[^>]+http-equiv=["\']refresh["\']', text, re.I):
                continue
            required = {
                "한 개의 제목": len(re.findall(r"<h1\b", text, re.I)) == 1,
                "본문": bool(re.search(r"<(?:main|article)\b", text, re.I)),
                "카테고리 CSS": "/css/savingio-brain-navigation.css" in text,
                "카테고리 데이터": "/data/savingio-brain-data.js" in text,
                "카테고리 실행기": "/js/savingio-brain-navigation.js" in text,
                "잘림 경고 없음": "Warning: truncated output" not in text,
            }
            missing = [name for name, ok in required.items() if not ok]
            if missing:
                failures.append(f"{page.name}: {', '.join(missing)}")
        self.assertFalse(failures, "\n".join(failures[:30]))

    def test_all_public_brain_pages_load_both_data_and_runtime(self):
        failures = []
        for page in ROOT.rglob("*.html"):
            relative = page.relative_to(ROOT)
            if relative.parts and relative.parts[0] in {".git", "factory"}:
                continue
            text = page.read_text(encoding="utf-8")
            if "/js/savingio-brain-navigation.js" not in text:
                continue
            if "/data/savingio-brain-data.js" not in text or "/js/savingio-brain-navigation.js" not in text:
                failures.append(str(relative))
        self.assertFalse(failures, "\n".join(failures[:30]))

    def test_search_index_excludes_redirect_and_escaped_duplicate_paths(self):
        search = json.loads((ROOT / "data/savingio-search-index.json").read_text(encoding="utf-8"))
        bad = [href for href in search["items"] if Path(href).name.startswith("#U")]
        self.assertFalse(bad, "\n".join(bad))

    def test_user_visible_regression_pages_force_the_repaired_brain_runtime(self):
        pages = [
            ROOT / "index.html",
            ROOT / "articles/index.html",
            ROOT / "articles/electricity-bill-saving.html",
            ROOT / "articles/apartment-leak-emergency-response.html",
            ROOT / "articles/daily-liability-leak-insurance.html",
            ROOT / "articles/home-water-leak-self-check.html",
            ROOT / "articles/apartment-management-fee-summer.html",
            ROOT / "articles/장기수선충당금-소유자-부담과-임차인-반환-확인-107af18f.html",
        ]
        for page in pages:
            text = page.read_text(encoding="utf-8")
            self.assertIn("/data/savingio-brain-data.js?v=12", text, page.name)
            self.assertIn("/js/savingio-brain-navigation.js?v=12", text, page.name)


if __name__ == "__main__":
    unittest.main()
