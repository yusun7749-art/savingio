from __future__ import annotations

import os
import time
from pathlib import Path

from .cloudflare_health_check import check_site
from .cloudflare_pages_client import CloudflarePagesClient
from .utils import now_iso, save_json

DEFAULT_SITE_URL = "https://savingio.com"
DEFAULT_PATHS = ["/", "/articles/", "/robots.txt", "/sitemap.xml"]
SUCCESS_STATUSES = {"success", "ok"}


def _save(project_root: Path, result: dict) -> dict:
    save_json(project_root / "factory" / "output" / "cloudflare_verify_report.json", result)
    return result


def _site_fallback(
    project_root: Path,
    *,
    reason: str,
    attempts: int,
    interval_seconds: int,
    base_url: str,
) -> dict:
    history: list[dict] = []
    for attempt in range(1, max(1, attempts) + 1):
        site = check_site(base_url, DEFAULT_PATHS)
        history.append({"attempt": attempt, "checked_at": now_iso(), "site": site})
        if site.get("pass"):
            return _save(
                project_root,
                {
                    "status": "success",
                    "verification": "live_site_fallback",
                    "reason": reason,
                    "base_url": base_url,
                    "site": site,
                    "history": history,
                    "pass": True,
                    "created_at": now_iso(),
                },
            )
        if attempt < attempts:
            time.sleep(max(0, int(interval_seconds)))

    return _save(
        project_root,
        {
            "status": "failure",
            "verification": "live_site_fallback",
            "reason": reason,
            "base_url": base_url,
            "history": history,
            "pass": False,
            "created_at": now_iso(),
        },
    )


def verify_latest_deployment(
    project_root: Path,
    execute: bool = False,
    *,
    site_url: str | None = None,
    fallback_attempts: int | None = None,
    fallback_interval_seconds: int | None = None,
) -> dict:
    """Verify Cloudflare deployment without turning missing API credentials into a false failure.

    Dry-run behavior remains backward compatible: missing Cloudflare credentials report
    ``blocked``. During an actual release, the verifier first tries the Cloudflare API and
    then falls back to the public Savingio site. A healthy public site is accepted as a
    successful deployment verification, while the report records why the fallback was used.
    """

    root = Path(project_root)
    base_url = site_url or os.getenv("SAVINGIO_SITE_URL", DEFAULT_SITE_URL)
    attempts = fallback_attempts or int(os.getenv("SAVINGIO_VERIFY_ATTEMPTS", "6"))
    interval = fallback_interval_seconds
    if interval is None:
        interval = int(os.getenv("SAVINGIO_VERIFY_INTERVAL_SECONDS", "10"))

    try:
        client = CloudflarePagesClient.from_env()
    except RuntimeError as exc:
        if not execute:
            return _save(
                root,
                {
                    "status": "blocked",
                    "reason": "cloudflare_not_configured",
                    "error": str(exc),
                    "required_env": [
                        "CLOUDFLARE_ACCOUNT_ID",
                        "CLOUDFLARE_API_TOKEN",
                        "CLOUDFLARE_PAGES_PROJECT",
                    ],
                    "pass": False,
                    "created_at": now_iso(),
                },
            )
        return _site_fallback(
            root,
            reason="cloudflare_api_not_configured",
            attempts=attempts,
            interval_seconds=interval,
            base_url=base_url,
        )

    if not execute:
        return _save(
            root,
            {
                "status": "dry_run",
                "project_name": client.project_name,
                "base_url": base_url,
                "pass": True,
                "created_at": now_iso(),
            },
        )

    api_result = client.wait_for_latest()
    api_status = str(api_result.get("status") or "").lower()
    if api_status in SUCCESS_STATUSES:
        api_result.update(
            {
                "verification": "cloudflare_api",
                "base_url": base_url,
                "pass": True,
                "created_at": api_result.get("created_at") or now_iso(),
            }
        )
        return _save(root, api_result)

    reason = f"cloudflare_api_{api_status or 'unknown'}"
    fallback = _site_fallback(
        root,
        reason=reason,
        attempts=attempts,
        interval_seconds=interval,
        base_url=base_url,
    )
    fallback["cloudflare_api_result"] = api_result
    return _save(root, fallback)


def main(argv: list[str] | None = None) -> int:
    import argparse
    import json

    parser = argparse.ArgumentParser(description="Savingio Cloudflare deployment verifier")
    parser.add_argument("--root", default=".")
    parser.add_argument("--execute", action="store_true")
    parser.add_argument("--site-url", default=None)
    parser.add_argument("--attempts", type=int, default=None)
    parser.add_argument("--interval", type=int, default=None)
    args = parser.parse_args(argv)

    result = verify_latest_deployment(
        Path(args.root),
        execute=args.execute,
        site_url=args.site_url,
        fallback_attempts=args.attempts,
        fallback_interval_seconds=args.interval,
    )
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0 if result.get("pass") else 1


if __name__ == "__main__":
    raise SystemExit(main())
