from __future__ import annotations
import time
from .cloudflare_deployment_monitor import parse_deployment
from .utils import now_iso

def deployment_id_from_response(response: dict) -> str | None:
    deployment = response.get("deployment") or {}
    return deployment.get("id")

def wait_for_new_deployment(
    client,
    previous_id: str | None,
    *,
    timeout_seconds: int = 240,
    poll_seconds: int = 10,
) -> dict:
    started = time.time()
    history = []
    observed_new_id = None

    while time.time() - started <= timeout_seconds:
        response = client.latest_deployment()
        if response.get("status") == "error":
            history.append({
                "status":"api_error",
                "error":response.get("error"),
                "checked_at":now_iso(),
            })
            time.sleep(max(1, int(poll_seconds)))
            continue

        parsed = parse_deployment(response)
        current_id = parsed.get("id")
        if current_id and current_id != previous_id:
            observed_new_id = current_id
            parsed["new_deployment"] = True
            parsed["checked_at"] = now_iso()
            history.append(parsed)
            if parsed["terminal"]:
                return {
                    "status":"success" if parsed["success"] else "failure",
                    "previous_id":previous_id,
                    "new_deployment_id":observed_new_id,
                    "deployment":parsed,
                    "history":history,
                    "elapsed_seconds":round(time.time()-started),
                }
        else:
            history.append({
                "id":current_id,
                "status":parsed.get("status",""),
                "new_deployment":False,
                "checked_at":now_iso(),
            })

        time.sleep(max(1, int(poll_seconds)))

    return {
        "status":"timeout",
        "previous_id":previous_id,
        "new_deployment_id":observed_new_id,
        "history":history,
        "elapsed_seconds":round(time.time()-started),
    }
