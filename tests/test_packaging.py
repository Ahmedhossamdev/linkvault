"""Release artifact checks, runnable with stdlib unittest or pytest."""
import json
import re
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
import zipfile

ROOT = Path(__file__).resolve().parents[1]


class PackagingTests(unittest.TestCase):
    def test_chromium_package_is_loadable_and_excludes_development_data(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / "extension.zip"
            result = subprocess.run([sys.executable, str(ROOT / "scripts/package_extension.py"), "--output", str(output)], capture_output=True, text=True)
            self.assertEqual(result.returncode, 0, result.stderr)
            with zipfile.ZipFile(output) as archive:
                names = set(archive.namelist())
                manifest = json.loads(archive.read("manifest.json"))
                self.assertTrue({"app.html", "app.js", "app.css", "LICENSE", "navigation.js", "ownership.js"} <= names)
                self.assertIn(manifest["background"]["service_worker"], names)
                for icon in manifest["icons"].values():
                    self.assertIn(icon, names)
                self.assertTrue({"icons/mark-light.svg", "icons/mark-dark.svg"} <= names)
                self.assertFalse(any(name.startswith(("tests/", ".", "examples/")) for name in names))
                self.assertNotIn("package.json", names)
                self.assertNotIn("README.md", names)
                self.assertIsNone(archive.testzip())
                html = archive.read("app.html").decode()
                for reference in re.findall(r'(?:src|href)="([^"#]+)"', html):
                    if not reference.startswith(("https://", "http://")):
                        self.assertIn(reference, names)
                for name in names:
                    if name.endswith(".js"):
                        for reference in re.findall(r"from ['\"]\./([^'\"]+)['\"]", archive.read(name).decode()):
                            self.assertIn(reference, names)

    def test_existing_output_is_not_overwritten(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / "extension.zip"
            output.write_bytes(b"keep this existing file")
            result = subprocess.run([sys.executable, str(ROOT / "scripts/package_extension.py"), "--output", str(output)], capture_output=True, text=True)
            self.assertNotEqual(result.returncode, 0)
            self.assertIn("already exists", result.stderr)
            self.assertEqual(output.read_bytes(), b"keep this existing file")


if __name__ == "__main__":
    unittest.main()
