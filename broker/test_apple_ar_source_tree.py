import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
AR = ROOT / "apple-ar" / "DOMSAppleAR"


class AppleARSourceTreeTests(unittest.TestCase):
    def test_required_native_sources_exist(self):
        for name in ("DOMSAppleARApp.swift", "ContentView.swift", "ARGlobeView.swift", "DOMARClient.swift", "DOMARModels.swift", "Info.plist"):
            with self.subTest(name=name):
                self.assertTrue((AR / name).is_file())

    def test_native_client_uses_canonical_ar_endpoints(self):
        text = (AR / "DOMARClient.swift").read_text(encoding="utf-8")
        self.assertIn('appendingPathComponent("v1/ar/state")', text)
        self.assertIn('appendingPathComponent("v1/ar/stream")', text)
        self.assertIn('dom.apple-ar.state.v1', text)

    def test_native_renderer_consumes_canonical_activation(self):
        models = (AR / "DOMARModels.swift").read_text(encoding="utf-8")
        renderer = (AR / "ARGlobeView.swift").read_text(encoding="utf-8")
        self.assertIn("let activation: DOMActivation", models)
        self.assertIn("object.activation.id", renderer)
        self.assertNotIn("max(object.anomaly", renderer)

    def test_risk_light_cadence_comes_from_canonical_activation(self):
        renderer = (AR / "ARGlobeView.swift").read_text(encoding="utf-8")
        self.assertIn('case "critical", "heavy": return .high', renderer)
        self.assertIn('case "elevated": return .medium', renderer)
        self.assertIn('case "active", "watching": return .low', renderer)
        self.assertIn('default: return .steady', renderer)
        self.assertIn("if object.officialAlert { return .high }", renderer)

    def test_risk_lights_stop_for_expired_or_cancelled_records(self):
        renderer = (AR / "ARGlobeView.swift").read_text(encoding="utf-8")
        self.assertIn('"cancelled"', renderer)
        self.assertIn('"expired"', renderer)
        self.assertIn("expiresAt <= now", renderer)
        self.assertIn("node.root.isEnabled = live", renderer)

    def test_risk_light_animation_is_continuous_between_network_versions(self):
        renderer = (AR / "ARGlobeView.swift").read_text(encoding="utf-8")
        self.assertIn("Timer.scheduledTimer", renderer)
        self.assertIn("animateRiskField()", renderer)
        self.assertIn("1.0 / 20.0", renderer)
        self.assertIn("stopAnimating()", renderer)

    def test_camera_and_arkit_requirements_declared(self):
        plist = (AR / "Info.plist").read_text(encoding="utf-8")
        project = (ROOT / "apple-ar" / "project.yml").read_text(encoding="utf-8")
        self.assertIn("NSCameraUsageDescription", plist)
        self.assertIn("arkit", plist.lower())
        self.assertIn('platform: iOS', project)
        self.assertIn('deploymentTarget: "17.0"', project)

    def test_ar_truth_document_rejects_fake_all_sensor_claim(self):
        readme = (ROOT / "apple-ar" / "README.md").read_text(encoding="utf-8")
        self.assertIn("not literally every private or inaccessible instrument on Earth", readme)
        self.assertIn("registered-not-ingesting", readme)


if __name__ == "__main__":
    unittest.main()
