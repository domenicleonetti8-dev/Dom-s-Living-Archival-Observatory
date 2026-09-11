import json
import threading
import unittest
import urllib.request
from http.server import ThreadingHTTPServer

import dom_observation_broker as core
import dom_server
from dom_visitors import VisitorLedger


class CombinedServerIntegrationTests(unittest.TestCase):
    def setUp(self):
        self.original_broker = core.BROKER
        self.original_visitors = dom_server.VISITORS
        self.broker = core.Broker()
        self.broker.adapters = {}
        self.visitors = VisitorLedger()
        core.BROKER = self.broker
        dom_server.VISITORS = self.visitors
        self.server = ThreadingHTTPServer(("127.0.0.1", 0), dom_server.Handler)
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        host, port = self.server.server_address
        self.base = f"http://{host}:{port}"

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join(timeout=2)
        self.visitors.close()
        self.broker.close()
        core.BROKER = self.original_broker
        dom_server.VISITORS = self.original_visitors

    def json_request(self, path, method="GET", payload=None, origin=None):
        data = None if payload is None else json.dumps(payload).encode("utf-8")
        headers = {"Accept": "application/json"}
        if data is not None:
            headers["Content-Type"] = "application/json"
        if origin:
            headers["Origin"] = origin
        req = urllib.request.Request(self.base + path, data=data, headers=headers, method=method)
        with urllib.request.urlopen(req, timeout=3) as response:
            body = response.read()
            return response.status, response.headers, json.loads(body) if body else None

    def test_one_server_exposes_observation_and_visitor_surfaces(self):
        status, _, health = self.json_request("/health")
        self.assertEqual(status, 200)
        self.assertTrue(health["ok"])
        self.assertEqual(health["service"], "dom-observation-broker")

        status, _, observations = self.json_request("/v1/observations")
        self.assertEqual(status, 200)
        self.assertEqual(observations["schema"], "dom.observation.batch.v1")
        self.assertEqual(observations["records"], [])

        status, _, sources = self.json_request("/v1/sources")
        self.assertEqual(status, 200)
        self.assertEqual(sources["activeAdapters"], 0)
        self.assertGreater(sources["registered"], 0)

        status, _, before = self.json_request("/v1/visitors")
        self.assertEqual(status, 200)
        self.assertEqual(before["totalVisitors"], 0)

        status, headers, heartbeat = self.json_request(
            "/v1/visitors/heartbeat",
            method="POST",
            payload={"visitorId": "browser_integration_1234567890", "page": "/hazards.html"},
            origin="https://domenicleonetti8-dev.github.io",
        )
        self.assertEqual(status, 200)
        self.assertEqual(heartbeat["totalVisitors"], 1)
        self.assertEqual(heartbeat["liveNow"], 1)
        self.assertTrue(heartbeat["firstVisit"])
        self.assertEqual(headers.get("Access-Control-Allow-Origin"), "https://domenicleonetti8-dev.github.io")

        _, _, after = self.json_request("/v1/visitors")
        self.assertEqual(after["totalVisitors"], 1)
        self.assertEqual(after["liveNow"], 1)

    def test_cors_preflight_allows_visitor_post(self):
        req = urllib.request.Request(
            self.base + "/v1/visitors/heartbeat",
            headers={"Origin": "https://domenicleonetti8-dev.github.io"},
            method="OPTIONS",
        )
        with urllib.request.urlopen(req, timeout=3) as response:
            self.assertEqual(response.status, 204)
            self.assertIn("POST", response.headers.get("Access-Control-Allow-Methods", ""))
            self.assertEqual(response.headers.get("Access-Control-Allow-Origin"), "https://domenicleonetti8-dev.github.io")


if __name__ == "__main__":
    unittest.main()
