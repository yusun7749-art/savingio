from __future__ import annotations
from pathlib import Path
import json, sqlite3
from datetime import datetime, timezone

REGISTRY_SCHEMA = """
CREATE TABLE IF NOT EXISTS content_registry(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  topic TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL,
  qa_score INTEGER NOT NULL DEFAULT 0,
  evidence_score INTEGER NOT NULL DEFAULT 0,
  article_path TEXT,
  content_hash TEXT,
  dna_version TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_registry_status ON content_registry(status);
CREATE INDEX IF NOT EXISTS idx_registry_topic ON content_registry(topic);
"""

def _now():
    return datetime.now(timezone.utc).astimezone().isoformat(timespec="seconds")

def ensure_registry(conn: sqlite3.Connection):
    conn.executescript(REGISTRY_SCHEMA)

def upsert_content(conn: sqlite3.Connection, item: dict):
    ensure_registry(conn)
    now = _now()
    conn.execute(
        """
        INSERT INTO content_registry(
          slug,topic,title,status,qa_score,evidence_score,article_path,
          content_hash,dna_version,created_at,updated_at
        ) VALUES(?,?,?,?,?,?,?,?,?,?,?)
        ON CONFLICT(slug) DO UPDATE SET
          topic=excluded.topic,title=excluded.title,status=excluded.status,
          qa_score=excluded.qa_score,evidence_score=excluded.evidence_score,
          article_path=excluded.article_path,content_hash=excluded.content_hash,
          dna_version=excluded.dna_version,updated_at=excluded.updated_at
        """,
        (
            item["slug"], item["topic"], item["title"], item["status"],
            int(item.get("qa_score",0)), int(item.get("evidence_score",0)),
            item.get("article_path"), item.get("content_hash"),
            item.get("dna_version"), now, now,
        ),
    )

def get_by_slug(conn: sqlite3.Connection, slug: str):
    ensure_registry(conn)
    row = conn.execute("SELECT * FROM content_registry WHERE slug=?", (slug,)).fetchone()
    return dict(row) if row else None

def list_content(conn: sqlite3.Connection, status: str|None=None, limit: int=200):
    ensure_registry(conn)
    if status:
        rows = conn.execute(
            "SELECT * FROM content_registry WHERE status=? ORDER BY updated_at DESC LIMIT ?",
            (status, int(limit)),
        ).fetchall()
    else:
        rows = conn.execute(
            "SELECT * FROM content_registry ORDER BY updated_at DESC LIMIT ?",
            (int(limit),),
        ).fetchall()
    return [dict(r) for r in rows]

def registry_summary(conn: sqlite3.Connection):
    ensure_registry(conn)
    rows = conn.execute("SELECT status, COUNT(*) c FROM content_registry GROUP BY status").fetchall()
    return {r["status"]: r["c"] for r in rows}
