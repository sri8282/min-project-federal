#!/usr/bin/env bash
# start_frontend.sh — Start the TrustFL React dev server
set -e

export PATH="/opt/homebrew/bin:$PATH"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR/frontend"

echo "🌐 Starting TrustFL Frontend on http://localhost:5173"
echo "   Make sure the backend is running on port 5001 first."
echo "   Press Ctrl+C to stop."

npm run dev
