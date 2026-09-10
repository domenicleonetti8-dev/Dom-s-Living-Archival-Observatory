#!/usr/bin/env python3
"""D.O.M. persistent observation broker.

Standard-library service for a Pi/server host. It keeps source state separate from
planet state and emits only normalized dom.observation.v1 records.
"""
from __future__ import annotations

import json
import math
import os
import signal
import threading
import time
import urllib.request
from dataclasses import dataclass, asdict
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Callable, Dict, List, Optional

HOST = os.getenv("DOM_BROKER_HOST", "0.0.0.0")
PORT = int(os.getenv("DOM_BROKER_PORT", "8787"))
POLL_SECONDS = max(30, int(os.getenv("DOM_BROKER_POLL_SECONDS", "60")))
MAX_RECORDS = max(1000, int(os.getenv("DOM_BROKER_MAX_RECORDS", "20000")))
ALLOWED_ORIGINS = {x.strip() for x in os.getenv("DOM_ALLOWED_ORIGINS", "https://domenicleonetti8-dev.github.io,http://localhost,http://127.0.0.1").split(",") if x.strip()}
USER_AGENT = "DOMS-Living-Archival-Observatory/0.1 public-research-broker"


def iso_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def iso_ms(ms) -> Optional[str]:
    try:
        return datetime.fromtimestamp(float(ms) / 1000, timezone.utc).isoformat().replace("+00:00", "Z")
    except (TypeError, ValueError, OSError):
        return None


def valid_lat_lon(lat, lon) -> bool:
    try:
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
                   mag=float(mag) if isinstance(mag, (int, float)) else None, quality=0.98)
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
                   authoritative=True, quality=0.84)
        if r:
            out.append(r)
    return out


@dataclass
class SourceState:
    id: str
    status: str = "registered"
    last_success: Optional[str] = None
    last_error: Optional[str] = None
    last_duration_ms: Optional[int] = None
    record_count: int = 0
    consecutive_failures: int = 0


class Broker:
    def __init__(self):
        self.lock = threading.RLock()
        self.records: Dict[str, dict] = {}
        self.sources: Dict[str, SourceState] = {
            "usgs-eq": SourceState("usgs-eq"),
            "nasa-eonet": SourceState("nasa-eonet"),
        }
        self.adapters: Dict[str, Callable[[], List[dict]]] = {
            "usgs-eq": poll_usgs,
            "nasa-eonet": poll_eonet,
        }
        self.version = 0
        self.stop_event = threading.Event()

    @staticmethod
    def key(r: dict) -> str:
        return f"{r.get('lineageId','')}|{r.get('sourceId','')}|{r.get('observedAt','')}"

    def poll_once(self):
        for sid, fn in self.adapters.items():
            st = self.sources[sid]
            started = time.monotonic()
            try:
                rows = fn()
                with self.lock:
                    for r in rows:
                        self.records[self.key(r)] = r
                    if len(self.records) > MAX_RECORDS:
                        oldest = sorted(self.records, key=lambda k: self.records[k].get("receivedAt") or "")[: len(self.records) - MAX_RECORDS]
                        for k in oldest:
                            self.records.pop(k, None)
                    self.version += 1
                st.status = "active"
                st.last_success = iso_now()
                st.last_error = None
                st.record_count = len(rows)
                st.consecutive_failures = 0
            except Exception as exc:
                st.status = "error"
                st.last_error = f"{type(exc).__name__}: {exc}"
                st.consecutive_failures += 1
            finally:
                st.last_duration_ms = round((time.monotonic() - started) * 1000)

    def loop(self):
        while not self.stop_event.is_set():
            self.poll_once()
            self.stop_event.wait(POLL_SECONDS)

    def snapshot(self):
        with self.lock:
            return list(self.records.values())

    def source_snapshot(self):
        return [asdict(s) for s in self.sources.values()]


BROKER = Broker()


class Handler(BaseHTTPRequestHandler):
    server_version = "DOMObservationBroker/0.1"

    def log_message(self, fmt, *args):
        print(f"[{iso_now()}] {self.client_address[0]} {fmt % args}")

    def cors(self):
        origin = self.headers.get("Origin")
        if origin and origin in ALLOWED_ORIGINS:
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
                                 "records": len(BROKER.snapshot()), "sources": BROKER.source_snapshot(), "time": iso_now()})
        elif path == "/v1/observations":
            rows = BROKER.snapshot()
            self.send_json(200, {"schema": "dom.observation.batch.v1", "generatedAt": iso_now(), "records": rows})
        elif path == "/v1/sources":
            self.send_json(200, {"sources": BROKER.source_snapshot(), "registered": len(BROKER.sources), "activeAdapters": len(BROKER.adapters)})
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
                        payload = json.dumps({"schema": "dom.observation.batch.v1", "records": BROKER.snapshot()}, separators=(",", ":"))
                        self.wfile.write(f"event: observations\ndata: {payload}\n\n".encode())
                        self.wfile.flush()
                    time.sleep(5)
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
    print(f"D.O.M. observation broker listening on http://{HOST}:{PORT} · {len(BROKER.adapters)} active adapters")
    try:
        server.serve_forever(poll_interval=0.5)
    finally:
        BROKER.stop_event.set()
        server.server_close()


if __name__ == "__main__":
    main()
