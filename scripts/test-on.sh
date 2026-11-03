#!/usr/bin/env bash
# Runs every package's test suite inside another runtime: `bash scripts/test-on.sh bun` or `deno`.
# vitest itself runs on that runtime, so every test file executes there. Needs `pnpm install` first.
set -euo pipefail

cd "$(dirname "$0")/.."
case "${1:-}" in
  bun) run=(bun --bun) ;;
  deno) run=(deno run --allow-all) ;;
  *)
    echo "Usage: bash scripts/test-on.sh bun|deno" >&2
    exit 2
    ;;
esac

for dir in packages/*/; do
  echo "==> $1: $dir"
  (cd "$dir" && "${run[@]}" ./node_modules/vitest/vitest.mjs run)
done
