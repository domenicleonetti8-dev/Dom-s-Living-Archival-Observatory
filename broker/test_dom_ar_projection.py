import unittest

from dom_ar_projection import AR_SCHEMA, SATELLITE_LAYERS, build_ar_state, project_record


class DOMARProjectionTests(unittest.TestCase):
    def test_projection_preserves_canonical_identity_and_location(self):
        record = {
            "schema": "dom.observation.v1",
            "sourceId": "station-1",
            "lineageId": "lineage-a",
            "sourceAgency": "Test Agency",
            "network": "Test Network",
            "kind": "Ocean Sensor",
            "modality": "buoy",
            "lat": 40.0,
            "lon": -74.0,
            "observedAt": "2026-09-11T00:00:00Z",
            "receivedAt": "2026-09-11T00:00:01Z",
            "sourceUrl": "https://example.com/source",
            "authoritative": True,
        }
        out = project_record(record)
        self.assertEqual(out["id"], "station-1")
        self.assertEqual(out["role"], "sensor")
        self.assertEqual(out["lat"], 40.0)
        self.assertEqual(out["lon"], -74.0)
        self.assertEqual(out["lineageId"], "lineage-a")

    def test_official_tsunami_stays_event_and_unlocated(self):
        record = {
            "schema": "dom.observation.v1",
            "sourceId": "tsu-1",
            "lineageId": "noaa-ntwc-atom",
            "sourceAgency": "NOAA NTWC",
            "kind": "Tsunami",
            "modality": "official-tsunami-product",
            "lat": None,
            "lon": None,
            "officialAlert": True,
            "authoritative": True,
        }
        out = project_record(record)
        self.assertEqual(out["role"], "event")
        self.assertIsNone(out["lat"])
        self.assertIsNone(out["lon"])
        self.assertTrue(out["officialAlert"])

    def test_satellite_observation_role_requires_satellite_modality(self):
        record = {
            "schema": "dom.observation.v1",
            "sourceId": "sat-1",
            "kind": "Thermal Observation",
            "modality": "satellite-thermal",
            "lat": 12.5,
            "lon": 15.0,
        }
        self.assertEqual(project_record(record)["role"], "satellite-observation")

    def test_state_reports_truthful_coverage(self):
        records = [
            {"schema": "dom.observation.v1", "sourceId": "a", "kind": "Sensor", "lat": 1, "lon": 2},
            {"schema": "dom.observation.v1", "sourceId": "b", "kind": "Space Weather", "lat": None, "lon": None},
        ]
        sources = [
            {"id": "a", "status": "active"},
            {"id": "b", "status": "stale"},
            {"id": "c", "status": "registered-not-ingesting"},
        ]
        state = build_ar_state(records, sources, 9)
        self.assertEqual(state["schema"], AR_SCHEMA)
        self.assertEqual(state["version"], 9)
        self.assertEqual(state["coverage"]["records"], 2)
        self.assertEqual(state["coverage"]["locatedRecords"], 1)
        self.assertEqual(state["coverage"]["unlocatedRecords"], 1)
        self.assertEqual(state["coverage"]["activeSourceFamilies"], 1)
        self.assertEqual(state["coverage"]["staleSourceFamilies"], 1)
        self.assertEqual(state["coverage"]["notIngestingSourceFamilies"], 1)
        self.assertEqual(state["coverage"]["satelliteLayerFamilies"], len(SATELLITE_LAYERS))

    def test_satellite_catalog_is_source_attributed(self):
        self.assertGreaterEqual(len(SATELLITE_LAYERS), 8)
        for layer in SATELLITE_LAYERS:
            self.assertTrue(layer["id"])
            self.assertTrue(layer["agency"])
            self.assertTrue(layer["sourceUrl"].startswith("https://"))
            self.assertIn("timeClass", layer)


if __name__ == "__main__":
    unittest.main()
