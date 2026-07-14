from __future__ import annotations
from pathlib import Path
from .utils import load_json, now_iso

def evaluate_research(package: dict, config_dir: Path) -> dict:
    rules = load_json(config_dir / "research_quality_rules.json")
    evidence = package.get("evidence", [])
    verified = [x for x in evidence if x.get("verified")]
    official = [x for x in evidence if x.get("official")]
    domains = {x.get("domain") for x in verified if x.get("domain")}
    claims = [x for x in verified if x.get("claim")]
    fresh = [x for x in verified if x.get("fresh") is True]
    checks = []

    def add(name: str, passed: bool, weight: int, detail: str):
        checks.append({
            "name": name,
            "passed": passed,
            "weight": weight,
            "earned": weight if passed else 0,
            "detail": detail,
        })

    add("verified_evidence", len(verified) >= rules["minimum_verified_evidence"], 25,
        f"{len(verified)}/{rules['minimum_verified_evidence']}")
    add("official_evidence", len(official) >= rules["minimum_official_evidence"], 20,
        f"{len(official)}/{rules['minimum_official_evidence']}")
    add("domain_diversity", len(domains) >= rules["minimum_unique_domains"], 15,
        f"{len(domains)}/{rules['minimum_unique_domains']}")
    add("claim_coverage", len(claims) >= rules["minimum_claims"], 15,
        f"{len(claims)}/{rules['minimum_claims']}")
    add("freshness", len(fresh) >= rules["minimum_fresh_evidence"], 10,
        f"{len(fresh)}/{rules['minimum_fresh_evidence']}")
    add("questions", len(package.get("research_questions", [])) >= rules["minimum_questions"], 10,
        f"{len(package.get('research_questions', []))}/{rules['minimum_questions']}")
    add("query_plan", len(package.get("query_plan", [])) >= rules["minimum_queries"], 5,
        f"{len(package.get('query_plan', []))}/{rules['minimum_queries']}")

    score = sum(x["earned"] for x in checks)
    critical = set(rules.get("critical_checks", []))
    critical_failures = [x["name"] for x in checks if x["name"] in critical and not x["passed"]]
    passed = score >= rules["pass_score"] and not critical_failures
    return {
        "score": score,
        "pass": passed,
        "minimum": rules["pass_score"],
        "checks": checks,
        "issues": [x["name"] for x in checks if not x["passed"]],
        "critical_failures": critical_failures,
        "checked_at": now_iso(),
    }
