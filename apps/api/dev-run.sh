#!/bin/bash

set -euo pipefail

APP_ROOT="$(cd "$(dirname "$0")" && pwd)"
ENTRYPOINT="${1:-main}"
TARGET_FILE="$APP_ROOT/dist/${ENTRYPOINT}.js"

cd "$APP_ROOT"

# Clean stale build artifacts to ensure a full recompile
rm -rf dist tsconfig.tsbuildinfo

bunx tsc -p tsconfig.json --watch --preserveWatchOutput &
TSC_PID=$!

cleanup() {
  kill "$TSC_PID" 2>/dev/null || true
}

trap cleanup EXIT INT TERM

until [ -f "$TARGET_FILE" ]; do
  sleep 1
done

bun --watch "$TARGET_FILE"
