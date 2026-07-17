from __future__ import annotations

from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]

REPLACEMENTS = {
    "articles/apartment-leak-emergency-response.html": {
        "https://placehold.co/1200x630/0b5d6b/ffffff/png?text=Savingio%20%7C%20Apartment%20Leak%20Emergency":
            "https://savingio.com/images/articles/apartment-leak-emergency-response.svg",
    },
    "articles/daily-liability-leak-insurance.html": {
        "https://placehold.co/1200x630/274c77/ffffff/png?text=Savingio%20%7C%20Leak%20Insurance%20Guide":
            "https://savingio.com/images/articles/daily-liability-leak-insurance.svg",
    },
    "articles/home-water-leak-self-check.html": {
        "https://placehold.co/1200x630/2a6f5f/ffffff/png?text=Savingio%20%7C%20Water%20Meter%20Check":
            "https://savingio.com/images/articles/home-water-leak-self-check.svg",
    },
}

REQUIRED_ASSETS = (
    "images/articles/apartment-leak-emergency-response.svg",
    "images/articles/daily-liability-leak-insurance.svg",
    "images/articles/home-water-leak-self-check.svg",
)


def main() -> int:
    missing = [path for path in REQUIRED_ASSETS if not (ROOT / path).is_file()]
    if missing:
        print("FAIL: missing repository image assets:")
        for path in missing:
            print(f" - {path}")
        return 1

    changed = 0
    for rel_path, replacements in REPLACEMENTS.items():
        path = ROOT / rel_path
        if not path.is_file():
            print(f"FAIL: missing article: {rel_path}")
            return 1

        original = path.read_text(encoding="utf-8")
        updated = original
        for old, new in replacements.items():
            updated = updated.replace(old, new)

        if "placehold.co" in updated:
            print(f"FAIL: placeholder remains in {rel_path}")
            return 1
        if "https://savingio.com/images/articles/" not in updated:
            print(f"FAIL: repository image URL missing in {rel_path}")
            return 1
        if updated.count("property=\"og:image\"") != 1:
            print(f"FAIL: og:image count is not 1 in {rel_path}")
            return 1
        if updated.count("twitter:image") != 1:
            print(f"FAIL: twitter:image count is not 1 in {rel_path}")
            return 1
        if "data-factory-hero=\"true\"" not in updated:
            print(f"FAIL: factory hero marker missing in {rel_path}")
            return 1

        if updated != original:
            path.write_text(updated, encoding="utf-8")
            changed += 1
            print(f"FIX: {rel_path}")
        else:
            print(f"PASS: {rel_path}")

    print(f"PASS: image pipeline complete; changed={changed}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
