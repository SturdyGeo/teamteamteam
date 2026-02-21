#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
INSTALL_DIR="${CANDOO_INSTALL_DIR:-$HOME/.local/bin}"
TARGET="$INSTALL_DIR/candoo"

cd "$ROOT_DIR"

echo "Building CLI binary..."
bun run build:cli

mkdir -p "$INSTALL_DIR"
cp "$ROOT_DIR/dist/candoo" "$TARGET"
chmod +x "$TARGET"

echo "Installed candoo to: $TARGET"

case ":$PATH:" in
  *":$INSTALL_DIR:"*) ;;
  *)
    echo "PATH does not include $INSTALL_DIR"
    echo "Add this to your shell profile:"
    echo "  export PATH=\"$INSTALL_DIR:\$PATH\""
    ;;
esac

echo "Run: candoo --help"
