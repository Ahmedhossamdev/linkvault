"""Package the Chromium runtime using an explicit allowlist, without private data."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import zipfile

ROOT = Path(__file__).resolve().parents[1]
EXTENSION = ROOT / "extension"
RUNTIME_FILES = (
    "manifest.json", "LICENSE", "app.html", "app.css", "app.js", "background.js",
    "capture-client.js", "capture.js", "core.js", "import.js", "library.js",
    "navigation.js", "network.js", "ownership.js", "progress.js", "reports.js",
    "icons/icon-16.png", "icons/icon-32.png", "icons/icon-48.png", "icons/icon-128.png",
    "icons/mark-light.svg", "icons/mark-dark.svg",
)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, help="ZIP destination; existing files are never overwritten")
    args = parser.parse_args()
    manifest = json.loads((EXTENSION / "manifest.json").read_text())
    version = manifest["version"]
    if not re.fullmatch(r"\d+\.\d+\.\d+(?:\.\d+)?", version):
        parser.error("Manifest version is not a numeric extension version")
    output = args.output or ROOT / "dist" / f"linkvault-chromium-{version}.zip"
    if output.exists():
        parser.error(f"Output already exists: {output}. Choose a new path.")
    payloads = []
    for name in RUNTIME_FILES:
        path = EXTENSION / name
        if path.resolve() != path.absolute() or not path.is_file():
            parser.error(f"Missing runtime file or symlink rejected: {name}")
        payloads.append((name, path.read_bytes()))
    output.parent.mkdir(parents=True, exist_ok=True)
    # Exclusive creation prevents accidental overwrite, even if another process races us.
    with output.open("xb") as stream:
        with zipfile.ZipFile(stream, "w", compression=zipfile.ZIP_DEFLATED) as archive:
            for name, data in payloads:
                info = zipfile.ZipInfo(name, date_time=(2026, 1, 1, 0, 0, 0))
                info.compress_type = zipfile.ZIP_DEFLATED
                info.external_attr = 0o100644 << 16
                archive.writestr(info, data)
    digest = hashlib.sha256(output.read_bytes()).hexdigest()
    print(f"Created {output} ({len(payloads)} runtime files)")
    print(f"SHA256 {digest}")
    print("Pre-release: manual browser checks and store submissions are still pending.")


if __name__ == "__main__":
    main()
