import io
import unittest
import zipfile

import dom_observation_broker as dom
from nhc_gis_adapter import parse_kml_geometry, poll_nhc_current_storms


def kmz(kml: str) -> bytes:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("doc.kml", kml)
    return buf.getvalue()


TRACK = kmz('''<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2"><Document><Placemark><LineString><coordinates>
-70,20,0 -69,21,0 -68,22,0
</coordinates></LineString></Placemark></Document></kml>''')

CONE = kmz('''<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2"><Document><Placemark><Polygon><outerBoundaryIs><LinearRing><coordinates>
-71,19,0 -67,19,0 -67,23,0 -71,23,0 -71,19,0
</coordinates></LinearRing></outerBoundaryIs></Polygon></Placemark></Document></kml>''')


class NHCGISAdapterTests(unittest.TestCase):
    def test_kmz_parser_preserves_line_and_polygon_coordinates(self):
        track = parse_kml_geometry(TRACK)
        cone = parse_kml_geometry(CONE)
        self.assertEqual(track["lines"][0]["type"], "LineString")
        self.assertEqual(track["lines"][0]["coordinates"], [[-70.0, 20.0], [-69.0, 21.0], [-68.0, 22.0]])
        self.assertEqual(cone["polygons"][0]["type"], "Polygon")
        self.assertEqual(cone["polygons"][0]["coordinates"][0][0], [-71.0, 19.0])

    def test_current_storm_emits_center_track_and_cone_without_invention(self):
        fixture = {"activeStorms": [{
            "id": "AL992026", "name": "TEST", "classification": "TS",
            "latitudeNumeric": 20.0, "longitudeNumeric": -70.0,
            "lastUpdate": "2026-09-11T18:00:00.000Z", "intensity": 45, "pressure": 1002,
            "movementDir": 315, "movementSpeed": 12,
            "publicAdvisory": {"url": "https://www.nhc.noaa.gov/text/MIATCPAT9.shtml"},
            "forecastTrack": {"advNum": "010", "issuance": "2026-09-11T18:00:00.000Z", "kmzFile": "https://example.com/TRACK.kmz"},
            "trackCone": {"advNum": "010", "issuance": "2026-09-11T18:00:00.000Z", "kmzFile": "https://example.com/CONE.kmz"},
        }]}
        blobs = {"https://example.com/TRACK.kmz": TRACK, "https://example.com/CONE.kmz": CONE}
        rows = poll_nhc_current_storms(lambda _: fixture, dom.record, dom.valid_lat_lon, lambda url: blobs[url])
        self.assertEqual(len(rows), 3)
        by_role = {r.get("geometryRole", "center"): r for r in rows}
        center = by_role["center"]
        self.assertEqual(center["locationPrecision"], "official-center")
        self.assertEqual(center["movementSpeedMph"], 12)
        self.assertEqual(center["intensityKt"], 45)
        self.assertEqual(by_role["forecast-track"]["geometry"]["type"], "LineString")
        self.assertEqual(by_role["forecast-track"]["observationStatus"], "forecast")
        self.assertIsNone(by_role["forecast-track"]["lat"])
        self.assertEqual(by_role["forecast-cone"]["geometry"]["type"], "Polygon")
        self.assertEqual(by_role["forecast-cone"]["advisoryNumber"], "010")

    def test_missing_geometry_product_keeps_official_center_and_records_failure(self):
        fixture = {"activeStorms": [{
            "id": "EP992026", "name": "TEST2", "latitudeNumeric": 12.0, "longitudeNumeric": -110.0,
            "lastUpdate": "2026-09-11T18:00:00.000Z",
            "publicAdvisory": {"url": "https://www.nhc.noaa.gov/"},
            "forecastTrack": {"issuance": "2026-09-11T18:00:00.000Z", "kmzFile": "https://example.com/bad.kmz"},
        }]}
        rows = poll_nhc_current_storms(lambda _: fixture, dom.record, dom.valid_lat_lon, lambda _: b"not kml")
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["locationPrecision"], "official-center")
        self.assertIn("forecast-track:no-line-geometry", rows[0]["geometryProductErrors"])


if __name__ == "__main__":
    unittest.main()
