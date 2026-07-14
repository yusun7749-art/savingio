from __future__ import annotations
from urllib.parse import quote
from .wordpress_connector import WordPressConnector
from .utils import now_iso

def _extract_items(response: dict) -> list[dict]:
    payload = response.get("payload")
    return payload if isinstance(payload, list) else []

def find_or_create_term(connector: WordPressConnector, taxonomy: str, name: str, create: bool = True) -> dict:
    endpoint = "/wp-json/wp/v2/categories" if taxonomy == "category" else "/wp-json/wp/v2/tags"
    search = connector._request("GET", endpoint + "?search=" + quote(name))
    if search.get("status") == "ok":
        exact = next((item for item in _extract_items(search) if str(item.get("name","")).strip().lower() == name.strip().lower()), None)
        if exact:
            return {"status":"found","id":exact.get("id"),"term":exact,"created_at":now_iso()}
    if not create:
        return {"status":"not_found","name":name,"created_at":now_iso()}
    created = connector._request("POST", endpoint, {"name":name})
    if created.get("status") == "ok":
        return {"status":"created","id":(created.get("payload") or {}).get("id"),"term":created.get("payload"),"created_at":now_iso()}
    return {"status":"error","response":created,"created_at":now_iso()}
