"""Checks for the local GitHub release helper."""
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
import zipfile


ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts" / "publish_github_release.py"


class PublishReleaseTests(unittest.TestCase):
    def test_missing_release_asset_stops_before_calling_github(self):
        with tempfile.TemporaryDirectory() as directory:
            missing_asset = Path(directory) / "missing.zip"
            result = subprocess.run(
                [
                    sys.executable,
                    str(SCRIPT),
                    "--asset",
                    str(missing_asset),
                    "--dry-run",
                ],
                capture_output=True,
                text=True,
            )
            self.assertNotEqual(result.returncode, 0)
            self.assertIn("Release asset does not exist", result.stderr)

    def test_asset_with_the_wrong_manifest_version_is_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            asset = Path(directory) / "wrong-version.zip"
            with zipfile.ZipFile(asset, "w") as archive:
                archive.writestr("manifest.json", '{"version":"0.0.0"}')
            result = subprocess.run(
                [sys.executable, str(SCRIPT), "--asset", str(asset), "--dry-run"],
                capture_output=True,
                text=True,
            )
            self.assertNotEqual(result.returncode, 0)
            self.assertIn("Release asset manifest version does not match", result.stderr)


if __name__ == "__main__":
    unittest.main()
