import unittest

import dom_observation_broker as dom
from dom_adapters import poll_tsunami_atom

ATOM = '''<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Fixture Tsunami Products</title>
  <entry>
    <id>urn:fixture:warning:1</id>
    <title>Tsunami Warning Number 1</title>
    <updated>2026-09-10T20:00:00Z</updated>
    <link rel="alternate" href="https://www.tsunami.gov/events/fixture-warning" />
  </entry>
  <entry>
    <id>urn:fixture:cancel:2</id>
    <title>Tsunami Warning Cancellation</title>
    <updated>2026-09-10T21:00:00Z</updated>
    <link rel="alternate" href="https://www.tsunami.gov/events/fixture-cancel" />
  </entry>
  <entry>
    <id>urn:fixture:info:3</id>
    <title>Tsunami Information Statement</title>
    <updated>2026-09-10T22:00:00Z</updated>
    <link rel="alternate" href="https://www.tsunami.gov/events/fixture-info" />
  </entry>
</feed>'''


class TsunamiAtomTests(unittest.TestCase):
    def rows(self, center="ntwc"):
        return poll_tsunami_atom(lambda _url: ATOM, dom.record, center)

    def test_warning_is_official_alert_without_fake_coordinates(self):
        row = self.rows()[0]
        self.assertEqual(row["kind"], "Tsunami")
        self.assertEqual(row["modality"], "official-tsunami-product")
        self.assertTrue(row["authoritative"])
        self.assertTrue(row["officialAlert"])
        self.assertEqual(row["observationStatus"], "forecast")
        self.assertEqual(row["severityText"], "Tsunami Warning")
        self.assertIsNone(row["lat"])
        self.assertIsNone(row["lon"])
        self.assertEqual(row["locationPrecision"], "unresolved")

    def test_cancellation_never_remains_an_alert(self):
        row = self.rows()[1]
        self.assertFalse(row["officialAlert"])
        self.assertEqual(row["observationStatus"], "reported")
        self.assertEqual(row["severityText"], "Tsunami cancellation")

    def test_information_statement_is_report_not_alert(self):
        row = self.rows()[2]
        self.assertFalse(row["officialAlert"])
        self.assertEqual(row["observationStatus"], "reported")

    def test_ntwc_and_ptwc_keep_independent_lineages(self):
        ntwc = self.rows("ntwc")[0]
        ptwc = self.rows("ptwc")[0]
        self.assertEqual(ntwc["lineageId"], "noaa-ntwc-atom")
        self.assertEqual(ptwc["lineageId"], "noaa-ptwc-atom")
        self.assertNotEqual(ntwc["sourceId"], ptwc["sourceId"])
        self.assertEqual(ntwc["sourceAgency"], "NOAA NTWC")
        self.assertEqual(ptwc["sourceAgency"], "NOAA PTWC")

    def test_malformed_xml_fails_adapter_instead_of_fabricating_records(self):
        with self.assertRaises(ValueError):
            poll_tsunami_atom(lambda _url: "<feed><entry>", dom.record, "ntwc")

    def test_unknown_center_is_rejected(self):
        with self.assertRaises(ValueError):
            poll_tsunami_atom(lambda _url: ATOM, dom.record, "unknown")


if __name__ == "__main__":
    unittest.main()
