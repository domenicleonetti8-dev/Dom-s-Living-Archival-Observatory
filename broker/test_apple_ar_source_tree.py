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

    def test_native_renderer_has_live_risk_lifecycle(self):
        renderer = (AR / "ARGlobeView.swift").read_text(encoding="utf-8")
        self.assertIn("SceneEvents.Update", renderer)
        self.assertIn('activation == "critical"', renderer)
        self.assertIn('activation == "heavy"', renderer)
        self.assertIn('activation == "elevated"', renderer)
        self.assertIn('activation == "active"', renderer)
        self.assertIn('activation == "watching"', renderer)
        self.assertIn('status.range(of: "resolved"', renderer)
        self.assertIn('status.range(of: "cancel"', renderer)
        self.assertIn("expiresAt <= now", renderer)
        self.assertIn("marker.entity.isEnabled = false", renderer)
        self.assertIn("period: 1.05", renderer)
        self.assertIn("period: 1.8", renderer)

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
