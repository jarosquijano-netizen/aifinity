#!/bin/bash
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

echo "Installing root dependencies..."
cd "$CLAUDE_PROJECT_DIR"
npm install

echo "Installing backend dependencies..."
cd "$CLAUDE_PROJECT_DIR/backend"
npm install

echo "Installing frontend dependencies..."
cd "$CLAUDE_PROJECT_DIR/frontend"
npm install

echo "All dependencies installed."
