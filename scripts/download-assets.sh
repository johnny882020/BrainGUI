#!/usr/bin/env bash
# Downloads fsaverage5 surface GIFTI files needed by Niivue.
# Run once before starting the development server.
set -euo pipefail

ASSETS_DIR="$(dirname "$0")/../apps/web/public/assets"
mkdir -p "$ASSETS_DIR"

BASE="https://raw.githubusercontent.com/niivue/niivue/main/tests/images"

download_if_missing() {
  local filename="$1"
  local url="$2"
  if [ ! -f "$ASSETS_DIR/$filename" ]; then
    echo "Downloading $filename..."
    curl -fsSL "$url" -o "$ASSETS_DIR/$filename"
  else
    echo "$filename already present, skipping."
  fi
}

download_if_missing "fsaverage5.lh.inflated.surf.gii" \
  "$BASE/fsaverage5.lh.inflated.surf.gii"

download_if_missing "fsaverage5.rh.inflated.surf.gii" \
  "$BASE/fsaverage5.rh.inflated.surf.gii"

echo "Assets ready in $ASSETS_DIR"
