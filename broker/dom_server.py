#!/usr/bin/env python3
"""D.O.M. combined observation + anonymous visitor telemetry server."""
from __future__ import annotations

import json
import signal
import threading
from http.server import ThreadingHTTPServer

import dom_observation_broker as core
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
        f"visitor telemetry enabled · SQLite {core.DB_PATH}"
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
