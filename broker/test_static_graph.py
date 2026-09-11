import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
HTML = (ROOT / "hazards.html").read_text(encoding="utf-8")
INDEX = (ROOT / "index.html").read_text(encoding="utf-8")
SCRIPT_RE = re.compile(r'<script\s+(?:defer\s+)?src="([^"]+)"(?:\s+defer)?></script>')
SCRIPTS = SCRIPT_RE.findall(HTML)
INDEX_SCRIPTS = SCRIPT_RE.findall(INDEX)
LOCAL = [src.split("?", 1)[0].removeprefix("./") for src in SCRIPTS if src.startswith("./")]
INDEX_LOCAL = [src.split("?", 1)[0].removeprefix("./") for src in INDEX_SCRIPTS if src.startswith("./")]


class StaticGraphTests(unittest.TestCase):
    def test_every_local_script_exists(self):
        missing = [p for p in LOCAL + INDEX_LOCAL if not (ROOT / p).is_file()]
        self.assertEqual(missing, [])

    def test_script_paths_are_unique_per_page(self):
        self.assertEqual(len(LOCAL), len(set(LOCAL)))
        self.assertEqual(len(INDEX_LOCAL), len(set(INDEX_LOCAL)))

    def test_all_scripts_are_local_source_first_assets(self):
        self.assertTrue(SCRIPTS)
        self.assertTrue(INDEX_SCRIPTS)
        self.assertTrue(all(src.startswith("./") for src in SCRIPTS + INDEX_SCRIPTS))

    def test_canonical_dependency_order(self):
        pos = {name: LOCAL.index(name) for name in LOCAL}
        before = [
            ("dom-runtime-config.js", "dom-visitors-client.js"),
            ("dom-runtime-config.js", "dom-observation-broker-client.js"),
            ("dom-visitors-client.js", "dom-broker-status.js"),
            ("dom-observation-model.js", "hazards.js"),
            ("dom-hazard-taxonomy.js", "hazards.js"),
            ("dom-environment-fusion.js", "hazards.js"),
            ("dom-environmental-defense.js", "dom-global-sensor-globe.js"),
            ("dom-sensor-activation.js", "dom-observation-ingress.js"),
            ("dom-observation-ingress.js", "dom-observation-broker-client.js"),
            ("dom-observation-ingress.js", "dom-organism-runtime.js"),
            ("dom-global-sensor-globe.js", "dom-organism-runtime.js"),
            ("dom-organism-runtime.js", "dom-live-globe-renderer.js"),
            ("dom-hazard-observation-bridge.js", "hazards.js"),
            ("dom-observation-hazard-bridge.js", "hazards.js"),
            ("dom-broker-status.js", "dom-global-compat.js"),
            ("dom-live-globe-renderer.js", "dom-global-compat.js"),
            ("dom-global-compat.js", "observation-ingress-tests.js"),
            ("dom-global-compat.js", "organism-path-tests.js"),
            ("hazards.js", "hazard-core-tests.js"),
            ("hazards.js", "dom-runtime-hardening-20000.js"),
        ]
        for a, b in before:
            with self.subTest(a=a, b=b):
                self.assertIn(a, pos)
                self.assertIn(b, pos)
                self.assertLess(pos[a], pos[b])

    def test_home_runtime_order(self):
        pos = {name: INDEX_LOCAL.index(name) for name in INDEX_LOCAL}
        for a, b in (("dom-runtime-config.js", "dom-visitors-client.js"), ("dom-visitors-client.js", "dom-home-visitors-ui.js"), ("dom-home-visitors-ui.js", "app.js")):
            with self.subTest(a=a, b=b):
                self.assertIn(a, pos)
                self.assertIn(b, pos)
                self.assertLess(pos[a], pos[b])

    def test_cache_versions_exist_on_runtime_scripts(self):
        missing = [src for src in SCRIPTS + INDEX_SCRIPTS if src.startswith("./") and "?v=" not in src]
        self.assertEqual(missing, [])

    def test_required_dom_targets_exist_once(self):
        for element_id in ("events", "map", "sourceState", "refreshAll", "enableLocal", "voiceOn", "voiceMute", "voiceState", "planetHealthSidebar"):
            with self.subTest(element_id=element_id):
                self.assertEqual(len(re.findall(rf'id="{re.escape(element_id)}"', HTML)), 1)

    def test_home_and_hazard_navigation_are_connected(self):
        self.assertIn('href="./hazards.html"', INDEX)
        self.assertIn('href="./index.html"', HTML)

    def test_creator_and_license_credit_exist_on_both_pages(self):
        for name, page in (("home", INDEX), ("hazards", HTML)):
            with self.subTest(page=name):
                self.assertIn("Kinetic Interface Systems LLC", page)
                self.assertIn("Domenic Leonetti", page)
                self.assertIn("MIT License", page)

    def test_stylesheet_path_exists(self):
        self.assertTrue((ROOT / "styles.css").is_file())
        self.assertIn('href="./styles.css', HTML)
        self.assertIn('href="./styles.css', INDEX)


if __name__ == "__main__":
    unittest.main()
