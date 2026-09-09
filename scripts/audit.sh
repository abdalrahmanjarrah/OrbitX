#!/usr/bin/env bash
# OrbitX Audit — run from project root
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

# Load .env if present
if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

echo "╔══════════════════════════════════════════════╗"
echo "║       OrbitX Automated Audit                ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

node scripts/audit.mjs "$@"
