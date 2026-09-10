import os
import tempfile
import unittest

import dom_observation_broker as dom
from dom_adapters import poll_nws, poll_swpc


class BrokerTests(unittest.TestCase):
    def test_coordinate_validation_rejects_missing_and_out_of_range(self):
        self.assertFalse(dom.valid_lat_lon(None, None))
        self.assertFalse(dom.valid_lat_lon("", ""))
        self.assertFalse(dom.valid_lat_lon(91, 0))
        self.assertTrue(dom.valid_lat_lon(40, -74))

    def test_source_url_rejects_non_http_and_malformed(self):
        self.assertIsNone(dom.source_url("javascript:alert(1)"))
        self.assertIsNone(dom.source_url("https://"))
        self.assertIsNone(dom.source_url("not a url"))
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

    def test_record_rejects_bad_time_and_normalizes_adapter_fields(self):
        bad = dom.record(source_id="x", lineage="L", agency="A", network="N", kind="Earthquake",
                         modality="seismic", observed_at="not-a-time", source="https://example.com", title="x")
        self.assertIsNone(bad)
        good = dom.record(source_id="x", lineage="L", agency="A", network="N", kind="Earthquake",
                          modality="seismic", observed_at="2026-09-10 12:00:00", source="https://example.com", title="x",
                          quality=7, freshness=-2, observationStatus="made-up", expiresAt="bad-expiry")
        self.assertEqual(good["observedAt"], "2026-09-10T12:00:00Z")
        self.assertEqual(good["quality"], 1.0)
        self.assertEqual(good["freshness"], 0.0)
        self.assertEqual(good["observationStatus"], "reported")
        self.assertIsNone(good["expiresAt"])

    def test_registry_truth_separates_registered_from_active_adapters(self):
        b = dom.Broker()
        try:
            self.assertEqual(len(b.sources), len(dom.REGISTERED_SOURCE_IDS))
            self.assertEqual(set(b.adapters), {"usgs-eq", "nasa-eonet", "nws-alerts", "swpc"})
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
            rows = b.poll_once()
            self.assertEqual(b.sources["usgs-eq"].status, "active")
            self.assertEqual(b.sources["usgs-eq"].record_count, 1)
            self.assertEqual(b.sources["wmo-gos"].status, "registered-not-ingesting")
            self.assertEqual(len(b.snapshot()), 1)
            self.assertEqual(len(b.stream_batch()), 1)
            self.assertEqual(rows[0]["sourceId"], "fixture")
        finally:
            b.close()

    def test_atomic_multi_source_cycle_publishes_all_sources_once(self):
        b = dom.Broker()
        try:
            a = dom.record(source_id="a", lineage="lineage-a", agency="A", network="A", kind="Earthquake",
                           modality="seismic", observed_at="2026-09-10T00:00:00Z", lat=40, lon=-74,
                           source="https://example.com/a", title="A")
            c = dom.record(source_id="c", lineage="lineage-c", agency="C", network="C", kind="Wildfire",
                           modality="satellite", observed_at="2026-09-10T00:01:00Z", lat=41, lon=-73,
                           source="https://example.com/c", title="C")
            b.adapters = {"usgs-eq": lambda: [a], "nasa-eonet": lambda: [c]}
            before = b.version
            cycle = b.poll_once()
            self.assertEqual(b.version, before + 1)
            self.assertEqual({r["sourceId"] for r in cycle}, {"a", "c"})
            self.assertEqual({r["sourceId"] for r in b.stream_batch()}, {"a", "c"})
            self.assertEqual({r["sourceId"] for r in b.snapshot()}, {"a", "c"})
        finally:
            b.close()

    def test_cycle_deduplicates_same_canonical_observation(self):
        b = dom.Broker()
        try:
            r = dom.record(source_id="same", lineage="same-lineage", agency="A", network="A", kind="Earthquake",
                           modality="seismic", observed_at="2026-09-10T00:00:00Z", lat=40, lon=-74,
                           source="https://example.com/same", title="Same")
            b.adapters = {"usgs-eq": lambda: [r], "nasa-eonet": lambda: [dict(r)]}
            cycle = b.poll_once()
            self.assertEqual(len(cycle), 1)
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

    def test_malformed_adapter_result_is_rejected(self):
        b = dom.Broker()
        try:
            b.adapters = {"usgs-eq": lambda: {"not": "a list"}}
            b.poll_once()
            self.assertEqual(b.sources["usgs-eq"].status, "error")
            self.assertIn("adapter result must be a list", b.sources["usgs-eq"].last_error)
            self.assertEqual(b.stream_batch(), [])
        finally:
            b.close()

    def test_active_source_ages_into_stale_without_becoming_error(self):
        b = dom.Broker()
        try:
            st = b.sources["usgs-eq"]
            st.status = "active"
            st.last_success = "2000-01-01T00:00:00Z"
            rows = {r["id"]: r for r in b.source_snapshot()}
            self.assertEqual(rows["usgs-eq"]["status"], "stale")
            self.assertEqual(st.status, "active")
            self.assertEqual(rows["wmo-gos"]["status"], "registered-not-ingesting")
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

    def test_swpc_alert_is_authoritative_but_not_fake_geolocated(self):
        fixture = [{"product_id": "K05A", "issue_datetime": "2026-09-10 12:00:00.000",
                    "message": "ALERT: Geomagnetic K-index of 5\nThreshold Reached: 2026 Sep 10 1200 UTC\nNOAA Scale: G1 - Minor"}]
        rows = poll_swpc(lambda _: fixture, dom.record, dom.valid_lat_lon)
        self.assertEqual(len(rows), 1)
        r = rows[0]
        self.assertEqual(r["kind"], "Space Weather")
        self.assertEqual(r["observationStatus"], "observed")
        self.assertTrue(r["authoritative"])
        self.assertFalse(r["officialAlert"])
        self.assertIsNone(r["lat"])
        self.assertIsNone(r["lon"])
        self.assertEqual(r["severityText"], "G1 - Minor")

    def test_swpc_watch_is_forecast_not_observation(self):
        fixture = [{"product_id": "A20F", "issue_datetime": "2026-09-10 12:00:00.000",
                    "message": "WATCH: Geomagnetic Storm Category G1 Predicted"}]
        rows = poll_swpc(lambda _: fixture, dom.record, dom.valid_lat_lon)
        self.assertEqual(rows[0]["observationStatus"], "forecast")


if __name__ == "__main__":
    unittest.main()
