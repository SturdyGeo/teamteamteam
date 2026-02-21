#!/usr/bin/env bash
set -euo pipefail

INSTALL_DIR="${TTTEAM_INSTALL_DIR:-$HOME/.local/bin}"
TARGET="$INSTALL_DIR/ttteam"

if [[ -f "$TARGET" ]]; then
  rm "$TARGET"
  echo "Removed $TARGET"
else
  echo "No install found at $TARGET"
fi
