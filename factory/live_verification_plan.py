from __future__ import annotations
from pathlib import Path
from .integration_preflight import run_integration_preflight
from .utils import save_json, now_iso

VERIFY_STEPS = {
    "cloudflare_pages": [
        "Read latest deployment ID",
        "Push an approved selected-file release",
        "Wait for a new deployment ID",
        "Verify deployment success",
        "Verify public home, articles, robots, sitemap and changed article",
    ],
    "google_search_console": [
        "Issue OAuth access token from service account",
        "Request Search Analytics data",
        "Normalize clicks, impressions, CTR and position",
        "Persist the raw response and normalized output",
    ],
    "google_analytics_4": [
        "Issue OAuth access token from service account",
        "Request GA4 runReport",
        "Normalize page views, users and sessions",
        "Persist the raw response and normalized output",
    ],
    "adsense_reporting": [
        "Import a downloaded AdSense CSV or JSON report",
        "Normalize earnings, clicks, impressions and RPM",
        "Merge revenue metrics with analytics pages",
        "Generate Revenue AI actions",
    ],
    "wordpress": [
        "Authenticate with application password",
        "Create or update a draft by slug",
        "Upload and connect the featured image",
        "Verify returned post ID and status",
    ],
    "image_provider": [
        "Check provider credential",
        "Queue a hero and infographic request",
        "Register returned files",
        "Verify article image manifest readiness",
    ],
}

def build_live_verification_plan(project_root: Path) -> dict:
    preflight = run_integration_preflight(project_root)
    plans = []
    for item in preflight["integrations"]:
        plans.append({
            "integration": item["name"],
            "ready": item["ready"],
            "missing_required_env": item["missing_required_env"],
            "steps": VERIFY_STEPS.get(item["name"], ["Run connector dry-run", "Execute with explicit approval", "Persist verification result"]),
            "status": "ready_to_verify" if item["ready"] else "configuration_required",
        })
    result = {
        "plan_count": len(plans),
        "ready_to_verify_count": sum(1 for row in plans if row["ready"]),
        "plans": plans,
        "created_at": now_iso(),
    }
    save_json(project_root/"factory"/"output"/"live_verification_plan.json", result)
    return result
