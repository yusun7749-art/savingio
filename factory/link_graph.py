from __future__ import annotations
from pathlib import Path
import re, json
from urllib.parse import urlparse
from .catalog import scan_articles
from .utils import save_json

def build_link_graph(project_root: Path):
    catalog = scan_articles(project_root)
    known = {row["url"]: row for row in catalog}
    known["/"] = {"title":"Savingio 홈","path":"index.html","url":"/"}
    known["/articles/"] = {"title":"글 목록","path":"articles/index.html","url":"/articles/"}
    nodes, edges, broken = [], [], []
    for row in catalog:
        path = project_root / row["path"]
        raw = path.read_text(encoding="utf-8", errors="ignore")
        nodes.append({"id": row["url"], "title": row["title"], "path": row["path"]})
        for href in re.findall(r'href=["\']([^"\']+)["\']', raw, re.I):
            if href.startswith(("http://","https://","mailto:","tel:","#","javascript:")):
                continue
            clean = href.split("#",1)[0].split("?",1)[0]
            if not clean:
                continue
            edges.append({"source": row["url"], "target": clean})
            if clean not in known:
                candidate = project_root / clean.lstrip("/")
                if clean.endswith("/"):
                    candidate = candidate / "index.html"
                if not candidate.exists():
                    broken.append({"source": row["url"], "target": clean})
    inbound = {}
    outbound = {}
    for e in edges:
        outbound[e["source"]] = outbound.get(e["source"], 0) + 1
        inbound[e["target"]] = inbound.get(e["target"], 0) + 1
    orphan = [n for n in nodes if inbound.get(n["id"],0) == 0]
    return {
        "node_count": len(nodes),
        "edge_count": len(edges),
        "broken_count": len(broken),
        "orphan_count": len(orphan),
        "nodes": nodes,
        "edges": edges,
        "broken": broken,
        "orphans": orphan,
        "inbound": inbound,
        "outbound": outbound,
    }

def save_link_graph(project_root: Path, output_path: Path|None=None):
    graph = build_link_graph(project_root)
    path = output_path or project_root/"factory"/"output"/"link_graph.json"
    save_json(path, graph)
    return graph
