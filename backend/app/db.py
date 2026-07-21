"""SQLite schema + helpers for V0."""
from __future__ import annotations

import sqlite3
import time
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator

_SCHEMA = """
CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  filename TEXT NOT NULL,
  content_type TEXT,
  size_bytes INTEGER NOT NULL DEFAULT 0,
  storage_path TEXT NOT NULL,
  text_chars INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS chunks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  UNIQUE(document_id, chunk_index)
);

CREATE VIRTUAL TABLE IF NOT EXISTS chunks_fts USING fts5(
  content,
  document_id UNINDEXED,
  chunk_index UNINDEXED,
  content='chunks',
  content_rowid='id'
);

CREATE TRIGGER IF NOT EXISTS chunks_ai AFTER INSERT ON chunks BEGIN
  INSERT INTO chunks_fts(rowid, content, document_id, chunk_index)
  VALUES (new.id, new.content, new.document_id, new.chunk_index);
END;

CREATE TRIGGER IF NOT EXISTS chunks_ad AFTER DELETE ON chunks BEGIN
  INSERT INTO chunks_fts(chunks_fts, rowid, content, document_id, chunk_index)
  VALUES ('delete', old.id, old.content, old.document_id, old.chunk_index);
END;

CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  detail TEXT,
  created_at TEXT NOT NULL
);
"""


def now_iso() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%S")


def connect(db_path: Path) -> sqlite3.Connection:
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(db_path), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db(db_path: Path) -> None:
    with connect(db_path) as conn:
        conn.executescript(_SCHEMA)
        conn.commit()


@contextmanager
def db_session(db_path: Path) -> Iterator[sqlite3.Connection]:
    conn = connect(db_path)
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def audit(
    conn: sqlite3.Connection,
    *,
    actor: str,
    action: str,
    resource_type: str | None = None,
    resource_id: str | None = None,
    detail: str | None = None,
) -> None:
    conn.execute(
        """INSERT INTO audit_log(actor, action, resource_type, resource_id, detail, created_at)
           VALUES (?,?,?,?,?,?)""",
        (actor, action, resource_type, resource_id, detail, now_iso()),
    )
