from __future__ import annotations

import json
from pathlib import Path
from typing import Iterable

from .utils import now_iso, save_json

CONFIG = Path("factory/config/life_money_taxonomy.json")
OUTPUT = Path("factory/output/life_money_brain")


def load_taxonomy(root: Path) -> dict:
    path = root / CONFIG
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, dict) or not isinstance(payload.get("categories"), dict):
        raise ValueError("life_money_taxonomy.json 형식이 올바르지 않습니다.")
    return payload


def expand_topics(root: Path, categories: Iterable[str] | None = None) -> dict:
    root = root.resolve()
    taxonomy = load_taxonomy(root)
    selected = {x.strip() for x in (categories or []) if x and x.strip()}
    nodes: list[dict] = []
    topics: list[str] = []

    for category, category_data in taxonomy["categories"].items():
        if selected and category not in selected:
            continue
        situations = category_data.get("situations", {})
        for situation, situation_topics in situations.items():
            for order, topic in enumerate(situation_topics, start=1):
                topic = str(topic).strip()
                if not topic:
                    continue
                topics.append(topic)
                nodes.append({
                    "category": category,
                    "situation": situation,
                    "topic": topic,
                    "order": order,
                    "path": [category, situation, topic],
                    "intent": "urgent_life_money_problem",
                    "brand_headline": taxonomy.get("brand_headline"),
                })

    deduped = list(dict.fromkeys(topics))
    output_dir = root / OUTPUT
    output_dir.mkdir(parents=True, exist_ok=True)
    queue_path = output_dir / "topics.txt"
    queue_path.write_text("\n".join(deduped) + "\n", encoding="utf-8")
    graph_path = output_dir / "knowledge_graph.json"
    report = {
        "version": taxonomy.get("version", "1.0.0"),
        "mode": "life_money_brain_auto_expansion",
        "brand_headline": taxonomy.get("brand_headline"),
        "selected_categories": sorted(selected) if selected else list(taxonomy["categories"].keys()),
        "category_count": len({node["category"] for node in nodes}),
        "situation_count": len({(node["category"], node["situation"]) for node in nodes}),
        "topic_count": len(deduped),
        "topics_file": queue_path.relative_to(root).as_posix(),
        "graph_file": graph_path.relative_to(root).as_posix(),
        "created_at": now_iso(),
        "pass": bool(deduped),
    }
    save_json(graph_path, {"nodes": nodes, "edges": _edges(nodes), "created_at": now_iso()})
    save_json(output_dir / "report.json", report)
    return report


def _edges(nodes: list[dict]) -> list[dict]:
    edges: list[dict] = []
    grouped: dict[tuple[str, str], list[dict]] = {}
    for node in nodes:
        grouped.setdefault((node["category"], node["situation"]), []).append(node)
    for (category, situation), items in grouped.items():
        edges.append({"from": category, "to": situation, "type": "contains"})
        for item in items:
            edges.append({"from": situation, "to": item["topic"], "type": "answers"})
        for left, right in zip(items, items[1:]):
            edges.append({"from": left["topic"], "to": right["topic"], "type": "next_question"})
    return edges
