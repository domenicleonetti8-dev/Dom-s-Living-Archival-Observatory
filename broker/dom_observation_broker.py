#!/usr/bin/env python3
"""D.O.M. persistent observation broker.

Standard-library service for a Pi/server host. Source/network health remains
separate from Earth health. Canonical observations are persisted in SQLite and
emitted as dom.observation.v1 records.
"""
from __future__ import annotations

import json
import math
import os
import signal
import sqlite3
import threading
import time
import urllib.request
from dataclasses import dataclass, asdict
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Callable, Dict, List, Optional

from dom_adapters import builtin_adapters

HOST = os.getenv("DOM_BROKER_HOST", "0.0.0.0")
PORT = int(os.getenv("DOM_BROKER_PORT", "8787"))
POLL_SECONDS = max(30, int(os.getenv("DOM_BROKER_POLL_SECONDS", "60")))
MAX_RECORDS = max(1000, int(os.getenv("DOM_BROKER_MAX_RECORDS", "20000")))
DB_PATH = os.getenv("DOM_BROKER_DB", os.path.join(os.path.dirname(__file__), "dom_observations.sqlite3"))
ALLOWED_ORIGINS = {x.strip() for x in os.getenv("DOM_ALLOWED_ORIGINS", "https://domenicleonetti8-dev.github.io,http://localhost,http://127.0.0.1").split(",") if x.strip()}
USER_AGENT = "DOMS-Living-Archival-Observatory/0.6 public-research-broker"
REGISTERED_SOURCE_IDS = (
    "wmo-gos", "gcos", "copernicus-era5", "argo", "usgs-eq", "usgs-water",
    "ndbc-stdmet", "ndbc-ocean", "ndbc-waterlevel", "ndbc-dart", "nws-alerts",
    "ntwc", "ptwc", "nasa-firms", "nasa-eonet", "gdacs", "swpc", "gfw",
    "noaa-crw", "nasa-sea-level",
)


def iso_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def iso_ms(ms) -> Optional[str]:
    try:
        return datetime.fromtimestamp(float(ms) / 1000, timezone.utc).isoformat().replace("+00:00", "Z")
    except (TypeError, ValueError, OSError):
        return None


def valid_lat_lon(lat, lon) -> bool:
    try:
        if lat is None or lon is None or lat == "" or lon == "":
            return False
        a, b = float(lat), float(lon)
        return math.isfinite(a) and math.isfinite(b) and -90 <= a <= 90 and -180 <= b <= 180
    except (TypeError, ValueError):
        return False


def get_json(url: str, timeout: int = 15):
    req = urllib.request.Request(url, headers={"Accept": "application/json", "User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.load(resp)


def source_url(url) -> Optional[str]:
    if isinstance(url, str) and (url.startswith("https://") or url.startswith("http://")):
        return url
    return None


def record(*, source_id: str, lineage: str, agency: str, network: str, kind: str,
           modality: str, observed_at: Optional[str], lat=None, lon=None,
           source: Optional[str], title: str, authoritative: bool = True, **extra):
    loc_ok = valid_lat_lon(lat, lon)
    r = {
        "schema": "dom.observation.v1",
        "sourceId": str(source_id or ""),
        "lineageId": str(lineage or ""),
        "sourceAgency": str(agency or ""),
        "network": str(network or ""),
        "kind": str(kind or "observation"),
        "modality": str(modality or ""),
        "lat": float(lat) if loc_ok else None,
        "lon": float(lon) if loc_ok else None,
        "locationPrecision": extra.pop("locationPrecision", "source-coordinate" if loc_ok else "unresolved"),
        "observedAt": observed_at,
        "receivedAt": iso_now(),
        "sourceUrl": source_url(source),
        "authoritative": bool(authoritative),
        "officialAlert": False,
        "title": str(title or kind or "observation"),
    }
    r.update(extra)
    if r.get("officialAlert") and not (r.get("authoritative") and r.get("sourceAgency") and r.get("sourceUrl")):
        r["officialAlert"] = False
    if not all((r["sourceId"], r["lineageId"], r["sourceAgency"], r["observedAt"], r["sourceUrl"])):
        return None
    return r


def poll_usgs() -> List[dict]:
    data = get_json("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson")
    out = []
    for f in data.get("features", []):
        fid = f.get("id")
        p = f.get("properties") or {}
        co = ((f.get("geometry") or {}).get("coordinates") or [])
        if not fid or len(co) < 2 or not valid_lat_lon(co[1], co[0]):
            continue
        mag = p.get("mag")
        r = record(source_id=f"usgs:{fid}", lineage="usgs-comcat", agency="USGS", network="USGS ComCat",
                   kind="Earthquake", modality="seismic", observed_at=iso_ms(p.get("time")), lat=co[1], lon=co[0],
                   source=p.get("url"), title=p.get("place") or "Earthquake", locationPrecision="epicenter",
                   mag=float(mag) if isinstance(mag, (int, float)) else None, quality=0.98,
                   observationStatus="observed")
        if r:
            out.append(r)
    return out


def poll_eonet() -> List[dict]:
    data = get_json("https://eonet.gsfc.nasa.gov/api/v3/events?status=open&days=30&limit=250")
    out = []
    for e in data.get("events", []):
        eid = e.get("id")
        if not eid:
            continue
        cats = " ".join(str(x.get("id") or x.get("title") or "").lower() for x in e.get("categories", []))
        kind = "Severe Storm" if "severestorm" in cats else "Wildfire" if "wildfire" in cats else "Volcano" if "volcano" in cats else None
        if not kind:
            continue
        geoms = e.get("geometry") or []
        g = geoms[-1] if geoms else {}
        co = g.get("coordinates") or []
        lat = co[1] if len(co) >= 2 else None
        lon = co[0] if len(co) >= 2 else None
        srcs = e.get("sources") or []
        url = next((x.get("url") for x in srcs if source_url(x.get("url"))), None) or e.get("link")
        observed = g.get("date")
        if observed:
            try:
                datetime.fromisoformat(observed.replace("Z", "+00:00"))
            except Exception:
                observed = None
        r = record(source_id=f"eonet:{eid}", lineage="nasa-eonet", agency="NASA EONET", network="NASA EONET",
                   kind=kind, modality="event-aggregation", observed_at=observed, lat=lat, lon=lon, source=url,
                   title=e.get("title") or kind, locationPrecision="event-geometry-point" if valid_lat_lon(lat, lon) else "unresolved",
                   authoritative=True, quality=0.84, observationStatus="aggregated")
        if r:
            out.append(r)
    return out


@dataclass
class SourceState:
    id: str
    status: str = "registered-not-ingesting"
    last_success: Optional[str] = None
    last_error: Optional[str] = None
    last_duration_ms: Optional[int] = None
    record_count: int = 0
    consecutive_failures: int = 0


class Broker:
    def __init__(self, db_path: str = ":memory:"):
        self.lock = threading.RLock()
        self.db_path = db_path
        self.db = sqlite3.connect(db_path, check_same_thread=False)
        self.db.execute("PRAGMA journal_mode=WAL")
        self.db.execute("CREATE TABLE IF NOT EXISTS observations (record_key TEXT PRIMARY KEY, received_at TEXT NOT NULL, payload TEXT NOT NULL)")
        self.db.execute("CREATE INDEX IF NOT EXISTS observations_received_idx ON observations(received_at)")
        self.db.commit()
        self.records: Dict[str, dict] = {}
        self.sources: Dict[str, SourceState] = {sid: SourceState(sid) for sid in REGISTERED_SOURCE_IDS}
        self.adapters: Dict[str, Callable[[], List[dict]]] = {"usgs-eq": poll_usgs, "nasa-eonet": poll_eonet}
        self.adapters.update(builtin_adapters(get_json, record, valid_lat_lon))
        self.last_batch: List[dict] = []
        self.version = 0
        self.stop_event = threading.Event()
        self._load_persisted()

    @staticmethod
    def key(r: dict) -> str:
        return f"{r.get('lineageId','')}|{r.get('sourceId','')}|{r.get('observedAt','')}"

    def _load_persisted(self):
        with self.lock:
            rows = self.db.execute("SELECT record_key,payload FROM observations ORDER BY received_at DESC LIMIT ?", (MAX_RECORDS,)).fetchall()
            for k, payload in rows:
                try:
                    r = json.loads(payload)
                    if r.get("schema") == "dom.observation.v1":
                        self.records[k] = r
                except (TypeError, json.JSONDecodeError):
                    continue

    def _persist_batch(self, rows: List[dict]):
        with self.lock:
            for r in rows:
                k = self.key(r)
                self.records[k] = r
                self.db.execute("INSERT OR REPLACE INTO observations(record_key,received_at,payload) VALUES(?,?,?)",
                                (k, r.get("receivedAt") or iso_now(), json.dumps(r, separators=(",", ":"), ensure_ascii=False)))
            self.db.execute("DELETE FROM observations WHERE record_key NOT IN (SELECT record_key FROM observations ORDER BY received_at DESC LIMIT ?)", (MAX_RECORDS,))
            self.db.commit()
            if len(self.records) > MAX_RECORDS:
                keep = {row[0] for row in self.db.execute("SELECT record_key FROM observations").fetchall()}
                self.records = {k: v for k, v in self.records.items() if k in keep}

    @classmethod
    def _dedupe_cycle(cls, rows: List[dict]) -> List[dict]:
        merged: Dict[str, dict] = {}
        for r in rows:
            if not isinstance(r, dict) or r.get("schema") != "dom.observation.v1":
                continue
            k = cls.key(r)
            old = merged.get(k)
            if old is None or str(r.get("receivedAt") or "") >= str(old.get("receivedAt") or ""):
                merged[k] = r
        return list(merged.values())

    def poll_once(self):
        cycle_rows: List[dict] = []
        attempted = 0
        for sid, fn in self.adapters.items():
            attempted += 1
            st = self.sources[sid]
            started = time.monotonic()
            try:
                rows = fn()
                if not isinstance(rows, list):
                    raise TypeError("adapter result must be a list")
                valid_rows = [r for r in rows if isinstance(r, dict) and r.get("schema") == "dom.observation.v1"]
                cycle_rows.extend(valid_rows)
                st.status = "active"
                st.last_success = iso_now()
                st.last_error = None
                st.record_count = len(valid_rows)
                st.consecutive_failures = 0
            except Exception as exc:
                st.status = "error"
                st.last_error = f"{type(exc).__name__}: {exc}"
                st.consecutive_failures += 1
            finally:
                st.last_duration_ms = round((time.monotonic() - started) * 1000)
        cycle_rows = self._dedupe_cycle(cycle_rows)
        if cycle_rows:
            self._persist_batch(cycle_rows)
        if attempted:
            with self.lock:
                self.last_batch = list(cycle_rows)
                self.version += 1
        return list(cycle_rows)

    def loop(self):
        while not self.stop_event.is_set():
            self.poll_once()
            self.stop_event.wait(POLL_SECONDS)

    def snapshot(self):
        with self.lock:
            return list(self.records.values())

    def stream_batch(self):
        with self.lock:
            return list(self.last_batch)

    def source_snapshot(self):
        return [asdict(self.sources[sid]) for sid in REGISTERED_SOURCE_IDS]

    def close(self):
        with self.lock:
            self.db.commit()
            self.db.close()


BROKER = Broker(DB_PATH)


class Handler(BaseHTTPRequestHandler):
    server_version = "DOMObservationBroker/0.6"

    def log_message(self, fmt, *args):
        print(f"[{iso_now()}] {self.client_address[0]} {fmt % args}")

    def origin_allowed(self, origin: Optional[str]) -> bool:
        if not origin:
            return False
        return origin in ALLOWED_ORIGINS or origin.startswith("http://localhost:") or origin.startswith("http://127.0.0.1:")

    def cors(self):
        origin = self.headers.get("Origin")
        if self.origin_allowed(origin):
            self.send_header("Access-Control-Allow-Origin", origin)
            self.send_header("Vary", "Origin")

    def send_json(self, status: int, payload):
        body = json.dumps(payload, separators=(",", ":"), ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.cors()
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        self.cors()
        self.send_header("Access-Control-Allow-Methods", "GET,OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Accept,Content-Type")
        self.end_headers()

    def do_GET(self):
        path = self.path.split("?", 1)[0]
        if path == "/health":
            self.send_json(200, {"ok": True, "service": "dom-observation-broker", "version": BROKER.version,
                                 "records": len(BROKER.snapshot()), "sources": BROKER.source_snapshot(), "time": iso_now(),
                                 "persistent": BROKER.db_path != ":memory:"})
        elif path == "/v1/observations":
            self.send_json(200, {"schema": "dom.observation.batch.v1", "generatedAt": iso_now(), "records": BROKER.snapshot()})
        elif path == "/v1/sources":
            sources = BROKER.source_snapshot()
            self.send_json(200, {"sources": sources, "registered": len(sources), "activeAdapters": len(BROKER.adapters),
                                 "active": sum(1 for x in sources if x["status"] == "active")})
        elif path == "/v1/stream":
            self.send_response(200)
            self.send_header("Content-Type", "text/event-stream")
            self.send_header("Cache-Control", "no-store")
            self.send_header("Connection", "keep-alive")
            self.cors()
            self.end_headers()
            last = -1
            try:
                while not BROKER.stop_event.is_set():
                    if BROKER.version != last:
                        last = BROKER.version
                        payload = json.dumps({"schema": "dom.observation.batch.v1", "version": last,
                                              "generatedAt": iso_now(), "records": BROKER.stream_batch()}, separators=(",", ":"))
                        self.wfile.write(f"event: observations\ndata: {payload}\n\n".encode())
                        self.wfile.flush()
                    else:
                        self.wfile.write(b": keepalive\n\n")
                        self.wfile.flush()
                    time.sleep(10)
            except (BrokenPipeError, ConnectionResetError):
                pass
        else:
            self.send_json(404, {"error": "not found"})


def main():
    poller = threading.Thread(target=BROKER.loop, name="dom-broker-poller", daemon=True)
    poller.start()
    server = ThreadingHTTPServer((HOST, PORT), Handler)
    def stop(*_):
        BROKER.stop_event.set()
        threading.Thread(target=server.shutdown, daemon=True).start()
    signal.signal(signal.SIGINT, stop)
    signal.signal(signal.SIGTERM, stop)
    print(f"D.O.M. observation broker listening on http://{HOST}:{PORT} · {len(BROKER.adapters)} active adapters · {len(BROKER.sources)} registered source families · SQLite {DB_PATH}")
    try:
        server.serve_forever(poll_interval=0.5)
    finally:
        BROKER.stop_event.set()
        server.server_close()
        BROKER.close()


if __name__ == "__main__":
    main()
