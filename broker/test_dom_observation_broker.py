import os
import tempfile
import unittest

import dom_observation_broker as dom
from dom_adapters import poll_nws


class BrokerTests(unittest.TestCase):
    def test_coordinate_validation_rejects_missing_and_out_of_range(self):
        self.assertFalse(dom.valid_lat_lon(None, None))
        self.assertFalse(dom.valid_lat_lon("", ""))
        self.assertFalse(dom.valid_lat_lon(91, 0))
        self.assertTrue(dom.valid_lat_lon(40, -74))

    def test_source_url_rejects_non_http(self):
        self.assertIsNone(dom.source_url("javascript:alert(1)"))
        self.assertEqual(dom.source_url("https://example.com/x"), "https://example.com/x")

    def test_record_requires_canonical_provenance(self):
        bad = dom.record(source_id="x", lineage="", agency="A", network="N", kind="Earthquake",
                         modality="seismic", observed_at=dom.iso_now(), source="https://example.com", title="x")
        self.assertIsNone(bad)
        good = dom.record(source_id="x", lineage="L", agency="A", network="N", kind="Earthquake",
                          modality="seismic", observed_at=dom.iso_now(), lat=40, lon=-74,
                          source="https://example.com", title="x")
        self.assertEqual(good["schema"], "dom.observation.v1")
        self.assertEqual(good["lat"], 40.0)
        self.assertEqual(good["lineageId"], "L")

    def test_registry_truth_separates_registered_from_active_adapters(self):
        b = dom.Broker()
        try:
            self.assertEqual(len(b.sources), len(dom.REGISTERED_SOURCE_IDS))
            self.assertEqual(set(b.adapters), {"usgs-eq", "nasa-eonet", "nws-alerts"})
            self.assertEqual(b.sources["wmo-gos"].status, "registered-not-ingesting")
        finally:
            b.close()

    def test_deterministic_poll_updates_only_real_adapter(self):
        b = dom.Broker()
        try:
            fixture = dom.record(source_id="fixture", lineage="fixture-lineage", agency="Fixture Agency",
                                 network="Fixture", kind="Earthquake", modality="seismic",
                                 observed_at="2026-09-10T00:00:00Z", lat=40, lon=-74,
                                 source="https://example.com/fixture", title="Fixture")
            b.adapters = {"usgs-eq": lambda: [fixture]}
            b.poll_once()
            self.assertEqual(b.sources["usgs-eq"].status, "active")
            self.assertEqual(b.sources["usgs-eq"].record_count, 1)
            self.assertEqual(b.sources["wmo-gos"].status, "registered-not-ingesting")
            self.assertEqual(len(b.snapshot()), 1)
            self.assertEqual(len(b.stream_batch()), 1)
        finally:
            b.close()

    def test_failed_adapter_is_error_not_active(self):
        b = dom.Broker()
        try:
            def fail():
                raise RuntimeError("fixture failure")
            b.adapters = {"usgs-eq": fail}
            b.poll_once()
            self.assertEqual(b.sources["usgs-eq"].status, "error")
            self.assertEqual(b.sources["usgs-eq"].consecutive_failures, 1)
            self.assertIn("fixture failure", b.sources["usgs-eq"].last_error)
        finally:
            b.close()

    def test_sqlite_survives_broker_restart(self):
        fd, path = tempfile.mkstemp(prefix="dom-broker-", suffix=".sqlite3")
        os.close(fd)
        try:
            first = dom.Broker(path)
            fixture = dom.record(source_id="persisted", lineage="persist-lineage", agency="Fixture Agency",
                                 network="Fixture", kind="Earthquake", modality="seismic",
                                 observed_at="2026-09-10T00:00:00Z", lat=41, lon=-73,
                                 source="https://example.com/persisted", title="Persistent Fixture")
            first.adapters = {"usgs-eq": lambda: [fixture]}
            first.poll_once()
            first.close()
            second = dom.Broker(path)
            try:
                rows = second.snapshot()
                self.assertEqual(len(rows), 1)
                self.assertEqual(rows[0]["sourceId"], "persisted")
                self.assertEqual(rows[0]["lineageId"], "persist-lineage")
            finally:
                second.close()
        finally:
            for suffix in ("", "-wal", "-shm"):
                try:
                    os.unlink(path + suffix)
                except FileNotFoundError:
                    pass

    def test_nws_adapter_preserves_official_semantics(self):
        fixture = {"features": [{
            "id": "https://api.weather.gov/alerts/test",
            "geometry": {"type": "Polygon", "coordinates": [[[179, 10], [-179, 10], [-179, 12], [179, 12], [179, 10]]]},
            "properties": {"event": "Test Warning", "sent": "2026-09-10T00:00:00Z", "expires": "2026-09-10T06:00:00Z",
                           "severity": "Severe", "certainty": "Observed", "urgency": "Immediate",
                           "@id": "https://api.weather.gov/alerts/test"}
        }]}
        rows = poll_nws(lambda _: fixture, dom.record, dom.valid_lat_lon)
        self.assertEqual(len(rows), 1)
        r = rows[0]
        self.assertTrue(r["officialAlert"])
        self.assertEqual(r["observationStatus"], "observed")
        self.assertEqual(r["expiresAt"], "2026-09-10T06:00:00Z")
        self.assertEqual(r["locationPrecision"], "alert-geometry-centroid")
        self.assertGreater(abs(r["lon"]), 170)
        self.assertEqual(r["severityText"], "Severe")


if __name__ == "__main__":
    unittest.main()
