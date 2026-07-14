from __future__ import annotations
from urllib.parse import quote
from .wordpress_connector import WordPressConnector
from .utils import now_iso

def upsert_post(
    connector: WordPressConnector,
    title: str,
    html: str,
    slug: str,
    status: str = "draft",
    category_ids: list[int] | None = None,
    tag_ids: list[int] | None = None,
    featured_media: int | None = None,
) -> dict:
    search = connector._request("GET", "/wp-json/wp/v2/posts?slug=" + quote(slug))
    existing = []
    if search.get("status") == "ok" and isinstance(search.get("payload"), list):
        existing = search["payload"]
    fields = {
        "title": title,
        "content": html,
        "slug": slug,
        "status": status,
    }
    if category_ids:
        fields["categories"] = category_ids
    if tag_ids:
        fields["tags"] = tag_ids
    if featured_media is not None:
        fields["featured_media"] = int(featured_media)

    if existing:
        post_id = existing[0]["id"]
        result = connector.update_post(post_id, **fields)
        action = "updated"
    else:
        result = connector.create_post(
            title, html, slug, status=status,
            category_ids=category_ids, tag_ids=tag_ids,
            featured_media=featured_media,
        )
        action = "created"

    return {
        "status": result.get("status"),
        "action": action,
        "post_id": (result.get("payload") or {}).get("id"),
        "response": result,
        "created_at": now_iso(),
    }
