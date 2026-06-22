#!/usr/bin/env bash
# start_backend.sh — Start the TrustFL Flask API
# IMPORTANT: Must be run from mini-5/ root OR from backend/ folder.
# Script automatically cd's into backend/ so Python imports resolve correctly.

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║    TrustFL — Backend Starting...         ║"
echo "╚══════════════════════════════════════════╝"
echo ""
echo "  URL  : http://localhost:5001  (proxied via Vite /api → localhost:5001)"
echo "  Dir  : $BACKEND_DIR"
echo ""
echo "  Press Ctrl+C to stop."
echo ""

# MUST cd into backend/ so that 'import simulation' etc. work
cd "$BACKEND_DIR"

python3 app.py
