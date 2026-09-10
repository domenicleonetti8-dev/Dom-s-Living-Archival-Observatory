import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
HTML = (ROOT / "hazards.html").read_text(encoding="utf-8")
SCRIPT_RE = re.compile(r'<script\s+src="([^"]+)"\s+defer></script>')
SCRIPTS = SCRIPT_RE.findall(HTML)
LOCAL = [src.split("?", 1)[0].removeprefix("./") for src in SCRIPTS if src.startswith("./")]


class StaticGraphTests(unittest.TestCase):
    def test_every_local_script_exists(self):
        missing = [p for p in LOCAL if not (ROOT / p).is_file()]
        self.assertEqual(missing, [])

    def test_script_paths_are_unique(self):
        self.assertEqual(len(LOCAL), len(set(LOCAL)))

    def test_all_scripts_are_local_source_first_assets(self):
        self.assertTrue(SCRIPTS)
        self.assertTrue(all(src.startswith("./") for src in SCRIPTS))

    def test_canonical_dependency_order(self):
        pos = {name: LOCAL.index(name) for name in LOCAL}
        before = [
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

    def test_cache_versions_exist_on_runtime_scripts(self):
        missing = [src for src in SCRIPTS if src.startswith("./") and "?v=" not in src]
        self.assertEqual(missing, [])

    def test_required_dom_targets_exist_once(self):
        for element_id in ("events", "map", "sourceState", "refreshAll", "enableLocal", "voiceOn", "voiceMute", "voiceState", "planetHealthSidebar"):
            with self.subTest(element_id=element_id):
                self.assertEqual(len(re.findall(rf'id="{re.escape(element_id)}"', HTML)), 1)

    def test_stylesheet_path_exists(self):
        self.assertTrue((ROOT / "styles.css").is_file())
        self.assertIn('href="./styles.css"', HTML)


if __name__ == "__main__":
    unittest.main()
