#!/usr/bin/env bash
set -euo pipefail

INSTALL_DIR="${CANDOO_INSTALL_DIR:-$HOME/.local/bin}"
TARGET="$INSTALL_DIR/candoo"

if [[ -f "$TARGET" ]]; then
  rm "$TARGET"
  echo "Removed $TARGET"
else
  echo "No install found at $TARGET"
fi
