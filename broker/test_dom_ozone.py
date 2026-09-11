import unittest

from dom_ozone import ozone_anomaly, linear_trend, ozone_packet


class OzoneModelTests(unittest.TestCase):
    def test_anomaly_uses_baseline(self):
        row = ozone_anomaly(270, 300)
        self.assertAlmostEqual(row['deltaDU'], -30)
        self.assertAlmostEqual(row['percent'], -10)

    def test_short_series_is_not_called_depletion(self):
        trend = linear_trend([
            {'decimalYear': 2025.0, 'totalColumnDU': 300},
            {'decimalYear': 2025.5, 'totalColumnDU': 280},
        ])
        self.assertFalse(trend['resolved'])
        packet = ozone_packet(total_column_du=280, baseline_du=300, trend=trend)
        self.assertIsNone(packet['depletionRateDUPerYear'])

    def test_supported_negative_trend_reports_depletion_rate(self):
        samples=[]
        for i in range(24):
            year=2020.0+i/6.0
            samples.append({'decimalYear':year,'totalColumnDU':320-2*(year-2020)})
        trend=linear_trend(samples)
        self.assertTrue(trend['resolved'])
        self.assertEqual(trend['direction'],'depletion')
        packet=ozone_packet(total_column_du=312,baseline_du=320,trend=trend,uncertainty_du=3)
        self.assertLess(packet['depletionRateDUPerYear'],0)
        self.assertIsNone(packet['recoveryRateDUPerYear'])


if __name__ == '__main__':
    unittest.main()
