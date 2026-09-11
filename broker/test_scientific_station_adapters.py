import unittest

from scientific_station_adapters import (
    parse_fdsn_station_text,
    parse_generic_station_json,
    parse_usgs_monitoring_locations,
)


def valid(lat, lon):
    try:
        lat, lon = float(lat), float(lon)
    except (TypeError, ValueError):
        return False
    return -90 <= lat <= 90 and -180 <= lon <= 180


def make_record(**kwargs):
    return kwargs


class ScientificStationAdapterTests(unittest.TestCase):
    def test_fdsn_station_text_emits_real_coordinates_only(self):
        text = """#Network|Station|Latitude|Longitude|Elevation|SiteName|StartTime|EndTime
IU|ANMO|34.9502|-106.4602|1839.0|Albuquerque, New Mexico, USA|2000-10-19T16:00:00|
IU|BAD|100.0|-106.0|0|Invalid|2020-01-01T00:00:00|
IU|ANMO|34.9502|-106.4602|1839.0|Duplicate|2000-10-19T16:00:00|
"""
        rows = parse_fdsn_station_text(text, make_record, valid, source_url="https://example.test/fdsn", snapshot_time="2026-09-11T08:00:00Z")
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["stationId"], "ANMO")
        self.assertEqual(rows[0]["network"], "IU")
        self.assertEqual(rows[0]["lat"], 34.9502)
        self.assertEqual(rows[0]["lon"], -106.4602)
        self.assertEqual(rows[0]["locationPrecision"], "source-coordinate")
        self.assertEqual(rows[0]["modality"], "seismic-station")
        self.assertEqual(rows[0]["observed_at"], "2026-09-11T08:00:00Z")
        self.assertTrue(rows[0]["inventorySnapshot"])

    def test_generic_json_rejects_missing_and_invalid_coordinates(self):
        payload = {"stations": [
            {"id": "A", "name": "Alpha", "lat": 10, "lon": 20},
            {"id": "B", "name": "Beta", "lat": 95, "lon": 20},
            {"id": "C", "name": "Gamma", "lat": None, "lon": 20},
        ]}
        rows = parse_generic_station_json(
            payload, make_record, valid,
            source_url="https://example.test/inventory", lineage="test-net", agency="Test", modality="test-station",
            snapshot_time="2026-09-11T08:00:00Z",
        )
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["stationId"], "A")
        self.assertEqual(rows[0]["lat"], 10.0)
        self.assertEqual(rows[0]["lon"], 20.0)
        self.assertEqual(rows[0]["observed_at"], "2026-09-11T08:00:00Z")

    def test_usgs_ogc_monitoring_locations_are_point_only(self):
        payload = {"features": [
            {
                "type": "Feature", "id": "USGS-01349150",
                "geometry": {"type": "Point", "coordinates": [-73.95, 41.50]},
                "properties": {
                    "monitoring_location_name": "Example River",
                    "agency_code": "USGS", "site_type": "Stream",
                    "state_name": "New York", "county_name": "Example County", "altitude": 150.2,
                },
            },
            {"type": "Feature", "id": "BAD", "geometry": {"type": "Point", "coordinates": [200, 41]}, "properties": {}},
            {"type": "Feature", "id": "POLY", "geometry": {"type": "Polygon", "coordinates": []}, "properties": {}},
        ]}
        rows = parse_usgs_monitoring_locations(
            payload, make_record, valid,
            source_url="https://api.waterdata.usgs.gov/ogcapi/v1/collections/monitoring-locations/items?f=json",
            snapshot_time="2026-09-11T08:00:00Z",
        )
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["stationId"], "USGS-01349150")
        self.assertEqual(rows[0]["platformClass"], "water-monitoring-site")
        self.assertEqual(rows[0]["siteType"], "Stream")
        self.assertEqual(rows[0]["lat"], 41.5)
        self.assertEqual(rows[0]["lon"], -73.95)


if __name__ == "__main__":
    unittest.main()
