"""SQLite library: the media table schema and every query in the app.

Rows are returned as plain dicts. Column meanings, the status lifecycle and
why the schema looks like this are in docs/data-model.md.
"""
import sqlite3
from contextlib import contextmanager
from pathlib import Path

from . import config

SCHEMA = """
CREATE TABLE IF NOT EXISTS media (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    media_type TEXT NOT NULL CHECK(media_type IN ('video', 'image', 'text')),
    collection TEXT NOT NULL DEFAULT 'Manual',
    title TEXT,
    caption TEXT,
    source_url TEXT UNIQUE,
    file_path TEXT,
    thumbnail_path TEXT,
    date_original TEXT,
    date_added TEXT NOT NULL DEFAULT (datetime('now')),
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK(status IN ('pending', 'downloaded', 'failed', 'manual'))
);
CREATE INDEX IF NOT EXISTS idx_media_collection ON media(collection);
CREATE INDEX IF NOT EXISTS idx_media_status ON media(status);
"""


@contextmanager
def connect():
    conn = sqlite3.connect(config.DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


# Paths are stored relative to config.DATA_DIR (e.g. "media/12.mp4") so the
# library survives being copied to another machine or directory; rows handed
# out by this module always carry absolute paths.
PATH_COLUMNS = ("file_path", "thumbnail_path")


def _to_stored(path):
    if path is None:
        return None
    try:
        return Path(path).relative_to(config.DATA_DIR).as_posix()
    except ValueError:
        return str(path)  # outside data/ -- keep as given


def _to_absolute(path):
    # joining an absolute path just returns it, so legacy rows still work
    return None if path is None else str(config.DATA_DIR / path)


def _row(r: sqlite3.Row) -> dict:
    d = dict(r)
    for col in PATH_COLUMNS:
        d[col] = _to_absolute(d[col])
    return d


def init_db():
    with connect() as conn:
        conn.executescript(SCHEMA)
        _migrate_absolute_paths(conn)


def _migrate_absolute_paths(conn):
    """Rows written before 2026-10-17 stored absolute paths. Files always sit
    directly in data/media or data/thumbnails, so keep the last two parts."""
    for col in PATH_COLUMNS:
        rows = conn.execute(f"SELECT id, {col} FROM media WHERE {col} LIKE '/%'").fetchall()
        updates = [
            ("/".join(Path(path).parts[-2:]), media_id)
            for media_id, path in rows
            if Path(path).parent.name in ("media", "thumbnails")
        ]
        conn.executemany(f"UPDATE media SET {col} = ? WHERE id = ?", updates)


def insert_media(item: dict) -> int | None:
    """Insert one row. Returns new id, or None if source_url already exists."""
    with connect() as conn:
        try:
            cur = conn.execute(
                """INSERT INTO media
                   (media_type, collection, title, caption, source_url,
                    file_path, thumbnail_path, date_original, status)
                   VALUES (:media_type, :collection, :title, :caption, :source_url,
                           :file_path, :thumbnail_path, :date_original, :status)""",
                {
                    "media_type": item.get("media_type", "video"),
                    "collection": item.get("collection", "Manual"),
                    "title": item.get("title"),
                    "caption": item.get("caption"),
                    "source_url": item.get("source_url"),
                    "file_path": _to_stored(item.get("file_path")),
                    "thumbnail_path": _to_stored(item.get("thumbnail_path")),
                    "date_original": item.get("date_original"),
                    "status": item.get("status", "pending"),
                },
            )
            return cur.lastrowid
        except sqlite3.IntegrityError:
            return None  # duplicate source_url, already imported


def get_by_collection(collection: str):
    with connect() as conn:
        # failed rows are unplayable (removed / region-blocked) -- keep them in
        # the DB so --retry-failed can find them, but don't show dead tiles
        if collection == "All":
            rows = conn.execute(
                "SELECT * FROM media WHERE status != 'failed' ORDER BY date_original DESC"
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT * FROM media WHERE collection = ? AND status != 'failed' "
                "ORDER BY date_original DESC",
                (collection,),
            ).fetchall()
        return [_row(r) for r in rows]


def get_pending():
    with connect() as conn:
        rows = conn.execute("SELECT * FROM media WHERE status = 'pending'").fetchall()
        return [_row(r) for r in rows]


# failure captions that won't change on retry: removed videos (10231/10240).
# Posts are skipped too -- the export gives signed CDN links that expire
# before they can be fetched.
PERMANENT_FAILURES = ("%status code 10231%", "%status code 10240%")


def requeue_failed() -> int:
    """Flip retryable 'failed' rows back to 'pending'. Returns how many."""
    clause = " AND ".join("caption NOT LIKE ?" for _ in PERMANENT_FAILURES)
    with connect() as conn:
        cur = conn.execute(
            f"UPDATE media SET status = 'pending', caption = NULL "
            f"WHERE status = 'failed' AND collection != 'Posts' AND {clause}",
            PERMANENT_FAILURES,
        )
        return cur.rowcount


def update_media(media_id: int, **fields):
    if not fields:
        return
    for col in PATH_COLUMNS:
        if col in fields:
            fields[col] = _to_stored(fields[col])
    cols = ", ".join(f"{k} = :{k}" for k in fields)
    fields["id"] = media_id
    with connect() as conn:
        conn.execute(f"UPDATE media SET {cols} WHERE id = :id", fields)


def counts_by_collection():
    with connect() as conn:
        rows = conn.execute(
            "SELECT collection, COUNT(*) as n FROM media GROUP BY collection"
        ).fetchall()
        return {r["collection"]: r["n"] for r in rows}
