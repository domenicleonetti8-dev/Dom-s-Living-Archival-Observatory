#!/usr/bin/env python3
"""D.O.M. combined observation + visitor + Apple AR telemetry server."""
from __future__ import annotations

import json
import signal
import threading
import time
from http.server import ThreadingHTTPServer

import dom_observation_broker as core
from dom_ar_projection import build_ar_state
from dom_visitors import VisitorLedger

VISITORS = VisitorLedger(core.DB_PATH)


class Handler(core.Handler):
    def do_OPTIONS(self):
        self.send_response(204)
        self.cors()
        self.send_header("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Accept,Content-Type")
        self.end_headers()

    def _read_json(self, max_bytes: int = 4096):
        try:
            length = int(self.headers.get("Content-Length") or 0)
        except ValueError:
            return None
        if length <= 0 or length > max_bytes:
            return None
        try:
            return json.loads(self.rfile.read(length).decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError):
            return None

    def _ar_state(self):
        return build_ar_state(core.BROKER.snapshot(), core.BROKER.source_snapshot(), core.BROKER.version)

    def do_POST(self):
        path = self.path.split("?", 1)[0]
        if path != "/v1/visitors/heartbeat":
            self.send_json(404, {"error": "not found"})
            return
        body = self._read_json()
        if not isinstance(body, dict):
            self.send_json(400, {"error": "invalid JSON body"})
            return
        try:
            payload = VISITORS.heartbeat(body.get("visitorId"), body.get("page") or "/")
        except ValueError as exc:
            self.send_json(400, {"error": str(exc)})
            return
        self.send_json(200, payload)

    def do_GET(self):
        path = self.path.split("?", 1)[0]
        if path == "/v1/visitors":
            self.send_json(200, VISITORS.stats())
            return
        if path == "/v1/ar/state":
            self.send_json(200, self._ar_state())
            return
        if path == "/v1/ar/stream":
            self.send_response(200)
            self.send_header("Content-Type", "text/event-stream")
            self.send_header("Cache-Control", "no-store")
            self.send_header("Connection", "keep-alive")
            self.cors()
            self.end_headers()
            last = -1
            try:
                while not core.BROKER.stop_event.is_set():
                    if core.BROKER.version != last:
                        last = core.BROKER.version
                        payload = json.dumps(self._ar_state(), separators=(",", ":"), ensure_ascii=False)
                        self.wfile.write(f"event: ar-state\ndata: {payload}\n\n".encode())
                        self.wfile.flush()
                    else:
                        self.wfile.write(b": keepalive\n\n")
                        self.wfile.flush()
                    time.sleep(10)
            except (BrokenPipeError, ConnectionResetError):
                pass
            return
        super().do_GET()


def main():
    poller = threading.Thread(target=core.BROKER.loop, name="dom-broker-poller", daemon=True)
    poller.start()
    server = ThreadingHTTPServer((core.HOST, core.PORT), Handler)

    def stop(*_):
        core.BROKER.stop_event.set()
        threading.Thread(target=server.shutdown, daemon=True).start()

    signal.signal(signal.SIGINT, stop)
    signal.signal(signal.SIGTERM, stop)
    print(
        f"D.O.M. server listening on http://{core.HOST}:{core.PORT} · "
        f"{len(core.BROKER.adapters)} active adapters · "
        f"{len(core.BROKER.sources)} registered source families · "
        f"Apple AR state + visitor telemetry enabled · SQLite {core.DB_PATH}"
    )
    try:
        server.serve_forever(poll_interval=0.5)
    finally:
        core.BROKER.stop_event.set()
        server.server_close()
        VISITORS.close()
        core.BROKER.close()


if __name__ == "__main__":
    main()
