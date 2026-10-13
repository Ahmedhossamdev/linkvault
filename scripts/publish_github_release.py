"""Create the matching GitHub prerelease from a verified local artifact."""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import zipfile


ROOT = Path(__file__).resolve().parents[1]
REPOSITORY = "Ahmedhossamdev/linkvault"


def run(command):
    return subprocess.run(command, cwd=ROOT, capture_output=True, text=True)


def fail(message):
    print(message, file=sys.stderr)
    raise SystemExit(1)


def main():
    manifest = json.loads((ROOT / "extension" / "manifest.json").read_text())
    version = manifest["version"]
    tag = f"v{version}"
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--asset", type=Path, default=ROOT / "dist" / f"linkvault-chromium-{version}.zip")
    parser.add_argument("--notes", type=Path, default=ROOT / "docs" / f"RELEASE_NOTES_v{version}.md")
    parser.add_argument("--dry-run", action="store_true", help="Validate and print the GitHub command without publishing")
    args = parser.parse_args()

    if not args.asset.is_file():
        fail(f"Release asset does not exist: {args.asset}")
    if not args.notes.is_file():
        fail(f"Release notes do not exist: {args.notes}")

    try:
        with zipfile.ZipFile(args.asset) as archive:
            asset_version = json.loads(archive.read("manifest.json"))["version"]
    except (KeyError, OSError, ValueError, zipfile.BadZipFile) as error:
        fail(f"Release asset has no readable manifest: {error}")
    if asset_version != version:
        fail("Release asset manifest version does not match extension/manifest.json")

    tagged_manifest = run(["git", "show", f"{tag}:extension/manifest.json"])
    if tagged_manifest.returncode != 0:
        fail(f"Required tag is missing: {tag}")
    try:
        tagged_version = json.loads(tagged_manifest.stdout)["version"]
    except (KeyError, ValueError) as error:
        fail(f"Tagged manifest is not readable: {error}")
    if tagged_version != version:
        fail(f"{tag} manifest version does not match extension/manifest.json")

    digest = hashlib.sha256(args.asset.read_bytes()).hexdigest()
    command = [
        "gh", "release", "create", tag, str(args.asset),
        "--repo", REPOSITORY,
        "--title", f"LinkVault {tag}",
        "--notes-file", str(args.notes),
        "--prerelease",
    ]
    print(f"Verified {args.asset.name}")
    print(f"SHA256 {digest}")
    print("Command: " + " ".join(command))
    if args.dry_run:
        return

    release = run(command)
    if release.returncode != 0:
        fail(release.stderr.strip() or "GitHub release creation failed")
    print(release.stdout.strip())


if __name__ == "__main__":
    main()
