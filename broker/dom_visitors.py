"""Privacy-preserving visitor/session telemetry for D.O.M.

Counts anonymous browser identifiers only. No IP addresses, geolocation,
fingerprinting, names, or user-agent history are stored.
"""
from __future__ import annotations

import hashlib
import re
import sqlite3
import threading
from datetime import datetime, timedelta, timezone

VISITOR_ID_RE = re.compile(r"^[A-Za-z0-9_-]{16,128}$")
LIVE_WINDOW_SECONDS = 120


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _iso(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def _hash_id(visitor_id: str) -> str:
    return hashlib.sha256(visitor_id.encode("utf-8")).hexdigest()


def _page(value) -> str:
    p = str(value or "/").strip()
    if not p.startswith("/"):
        p = "/"
    return p[:256]


class VisitorLedger:
    def __init__(self, db_path: str = ":memory:", live_window_seconds: int = LIVE_WINDOW_SECONDS):
        self.lock = threading.RLock()
        self.live_window_seconds = max(30, int(live_window_seconds))
        self.db = sqlite3.connect(db_path, check_same_thread=False)
        self.db.execute("PRAGMA journal_mode=WAL")
        self.db.execute(
            "CREATE TABLE IF NOT EXISTS visitor_sessions ("
            "visitor_hash TEXT PRIMARY KEY, first_seen TEXT NOT NULL, "
            "last_seen TEXT NOT NULL, last_page TEXT NOT NULL)"
        )
        self.db.execute("CREATE INDEX IF NOT EXISTS visitor_last_seen_idx ON visitor_sessions(last_seen)")
        self.db.commit()

    def heartbeat(self, visitor_id: str, page: str = "/", now: datetime | None = None) -> dict:
        visitor_id = str(visitor_id or "")
        if not VISITOR_ID_RE.fullmatch(visitor_id):
            raise ValueError("invalid visitor id")
        now = now or _now()
        stamp = _iso(now)
        key = _hash_id(visitor_id)
        page = _page(page)
        with self.lock:
            existing = self.db.execute(
                "SELECT first_seen FROM visitor_sessions WHERE visitor_hash=?", (key,)
            ).fetchone()
            if existing:
                self.db.execute(
                    "UPDATE visitor_sessions SET last_seen=?,last_page=? WHERE visitor_hash=?",
                    (stamp, page, key),
                )
                first_visit = False
            else:
                self.db.execute(
                    "INSERT INTO visitor_sessions(visitor_hash,first_seen,last_seen,last_page) VALUES(?,?,?,?)",
                    (key, stamp, stamp, page),
                )
                first_visit = True
            self.db.commit()
        return {**self.stats(now), "firstVisit": first_visit}

    def stats(self, now: datetime | None = None) -> dict:
        now = now or _now()
        cutoff = _iso(now - timedelta(seconds=self.live_window_seconds))
        with self.lock:
            total = int(self.db.execute("SELECT COUNT(*) FROM visitor_sessions").fetchone()[0])
            live = int(self.db.execute(
                "SELECT COUNT(*) FROM visitor_sessions WHERE last_seen>=?", (cutoff,)
            ).fetchone()[0])
        return {
            "schema": "dom.visitors.v1",
            "totalVisitors": total,
            "liveNow": live,
            "liveWindowSeconds": self.live_window_seconds,
            "generatedAt": _iso(now),
            "definition": "anonymous browser identifiers; approximate visitors, not verified people",
        }

    def close(self):
        with self.lock:
            self.db.commit()
            self.db.close()


__all__ = ["VisitorLedger", "VISITOR_ID_RE", "LIVE_WINDOW_SECONDS"]
