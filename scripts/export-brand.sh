#!/bin/sh
set -eu

# Run from the repository root. Sources are editable SVGs; PNGs are generated assets.
command -v rsvg-convert >/dev/null 2>&1 || { echo 'Install librsvg (rsvg-convert) to export branding assets.' >&2; exit 1; }
test -f extension/icons/icon.svg || { echo 'Run this script from the repository root.' >&2; exit 1; }
for size in 16 32 48 128; do
  rsvg-convert --width "$size" --height "$size" --output "extension/icons/icon-$size.png" extension/icons/icon.svg
done
rsvg-convert --output brand/launch-card.png brand/launch-card.svg
rsvg-convert --output brand/wordmark-light.png brand/wordmark-light.svg
rsvg-convert --output brand/wordmark-dark.png brand/wordmark-dark.svg
