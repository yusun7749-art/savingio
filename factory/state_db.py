from __future__ import annotations
from pathlib import Path
import json, sqlite3
from datetime import datetime, timezone

SCHEMA = """
CREATE TABLE IF NOT EXISTS runs(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  topic TEXT NOT NULL,
  status TEXT NOT NULL,
  qa_score INTEGER,
  article_path TEXT,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  payload_json TEXT
);
CREATE TABLE IF NOT EXISTS queue(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  topic TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 50,
  status TEXT NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS approvals(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  status TEXT NOT NULL,
  note TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS dead_letter(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  queue_id INTEGER,
  topic TEXT NOT NULL,
  error TEXT NOT NULL,
  attempts INTEGER NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS dna_versions(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  version TEXT NOT NULL UNIQUE,
  checksum TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);
"""

def _now():
    return datetime.now(timezone.utc).astimezone().isoformat(timespec="seconds")

def connect(db_path: Path):
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    conn.executescript(SCHEMA)
    return conn

def add_queue_item(db_path: Path, topic: str, priority: int = 50):
    now = _now()
    with connect(db_path) as c:
        cur = c.execute(
            "INSERT INTO queue(topic,priority,status,attempts,created_at,updated_at) VALUES(?,?,?,?,?,?)",
            (topic.strip(), int(priority), "pending", 0, now, now),
        )
        return cur.lastrowid

def fetch_next_queue_item(db_path: Path):
    with connect(db_path) as c:
        row = c.execute(
            "SELECT * FROM queue WHERE status='pending' ORDER BY priority DESC, id ASC LIMIT 1"
        ).fetchone()
        return dict(row) if row else None

def update_queue_item(db_path: Path, item_id: int, status: str, increment_attempt=False):
    now = _now()
    with connect(db_path) as c:
        if increment_attempt:
            c.execute(
                "UPDATE queue SET status=?, attempts=attempts+1, updated_at=? WHERE id=?",
                (status, now, item_id),
            )
        else:
            c.execute(
                "UPDATE queue SET status=?, updated_at=? WHERE id=?",
                (status, now, item_id),
            )

def record_run_start(db_path: Path, topic: str):
    with connect(db_path) as c:
        cur = c.execute(
            "INSERT INTO runs(topic,status,started_at) VALUES(?,?,?)",
            (topic, "running", _now()),
        )
        return cur.lastrowid

def record_run_finish(db_path: Path, run_id: int, status: str, qa_score=None, article_path=None, payload=None):
    with connect(db_path) as c:
        c.execute(
            "UPDATE runs SET status=?, qa_score=?, article_path=?, finished_at=?, payload_json=? WHERE id=?",
            (status, qa_score, article_path, _now(), json.dumps(payload or {}, ensure_ascii=False), run_id),
        )

def get_state(db_path: Path):
    with connect(db_path) as c:
        runs = c.execute("SELECT status, COUNT(*) c FROM runs GROUP BY status").fetchall()
        queue = c.execute("SELECT status, COUNT(*) c FROM queue GROUP BY status").fetchall()
        return {
            "runs": {r["status"]: r["c"] for r in runs},
            "queue": {r["status"]: r["c"] for r in queue},
        }


def move_to_dead_letter(db_path: Path, queue_item: dict, error: str):
    with connect(db_path) as c:
        c.execute(
            "INSERT INTO dead_letter(queue_id,topic,error,attempts,created_at) VALUES(?,?,?,?,?)",
            (queue_item.get("id"), queue_item.get("topic",""), error,
             int(queue_item.get("attempts",0)), _now()),
        )
        c.execute("UPDATE queue SET status='dead_letter', updated_at=? WHERE id=?",
                  (_now(), queue_item.get("id")))

def list_dead_letter(db_path: Path, limit: int=100):
    with connect(db_path) as c:
        rows = c.execute(
            "SELECT * FROM dead_letter ORDER BY id DESC LIMIT ?", (int(limit),)
        ).fetchall()
        return [dict(r) for r in rows]
