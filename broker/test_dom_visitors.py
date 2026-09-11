import os
import tempfile
import unittest
from datetime import datetime, timedelta, timezone

from dom_visitors import VisitorLedger


class VisitorLedgerTests(unittest.TestCase):
    def test_total_counts_unique_anonymous_browser_ids(self):
        ledger = VisitorLedger()
        try:
            t = datetime(2026, 9, 10, 12, 0, tzinfo=timezone.utc)
            a = ledger.heartbeat("browser_A_1234567890", "/hazards.html", t)
            b = ledger.heartbeat("browser_A_1234567890", "/hazards.html", t + timedelta(seconds=30))
            c = ledger.heartbeat("browser_B_1234567890", "/hazards.html", t + timedelta(seconds=40))
            self.assertTrue(a["firstVisit"])
            self.assertFalse(b["firstVisit"])
            self.assertTrue(c["firstVisit"])
            self.assertEqual(c["totalVisitors"], 2)
            self.assertEqual(c["liveNow"], 2)
        finally:
            ledger.close()

    def test_live_count_ages_out_without_reducing_total(self):
        ledger = VisitorLedger(live_window_seconds=120)
        try:
            t = datetime(2026, 9, 10, 12, 0, tzinfo=timezone.utc)
            ledger.heartbeat("browser_A_1234567890", "/", t)
            ledger.heartbeat("browser_B_1234567890", "/", t + timedelta(seconds=60))
            s = ledger.stats(t + timedelta(seconds=181))
            self.assertEqual(s["totalVisitors"], 2)
            self.assertEqual(s["liveNow"], 0)
        finally:
            ledger.close()

    def test_invalid_identifier_is_rejected(self):
        ledger = VisitorLedger()
        try:
            with self.assertRaises(ValueError):
                ledger.heartbeat("short", "/")
        finally:
            ledger.close()

    def test_persistence_survives_restart(self):
        fd, path = tempfile.mkstemp(prefix="dom-visitors-", suffix=".sqlite3")
        os.close(fd)
        try:
            t = datetime(2026, 9, 10, 12, 0, tzinfo=timezone.utc)
            first = VisitorLedger(path)
            first.heartbeat("browser_A_1234567890", "/hazards.html", t)
            first.close()
            second = VisitorLedger(path)
            try:
                self.assertEqual(second.stats(t + timedelta(seconds=10))["totalVisitors"], 1)
            finally:
                second.close()
        finally:
            for suffix in ("", "-wal", "-shm"):
                try:
                    os.unlink(path + suffix)
                except FileNotFoundError:
                    pass


if __name__ == "__main__":
    unittest.main()
