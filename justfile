packages := "cipher-kit compress-kit generate-certs get-client-ip modern-cookies @internal/helpers"

_default:
  just --list

# ── Dev ──────────────────────────────────────────

[group('dev')]
install:
  pnpm install

[group('dev')]
build target="all":
  #!/usr/bin/env bash
  set -euo pipefail
  if [ "{{ target }}" = "all" ]; then
    pnpm build
  else
    pnpm --filter {{ target }} build
  fi

# ── Verify ───────────────────────────────────────

[group('verify')]
fmt:
  pnpm format
  pnpm format:md

[group('verify')]
lint:
  pnpm lint

[group('verify')]
typecheck:
  pnpm typecheck

[group('verify')]
test target="all":
  #!/usr/bin/env bash
  set -euo pipefail
  if [ "{{ target }}" = "all" ]; then
    pnpm test
  else
    pnpm --filter {{ target }} test
  fi

[group('verify')]
smoke:
  pnpm smoke

[group('verify')]
attw:
  pnpm attw

[group('verify')]
verify: fmt lint typecheck

[group('verify')]
full-verify: fmt lint typecheck test attw smoke

# ── Deps ─────────────────────────────────────────

[group('deps')]
update target="all":
  #!/usr/bin/env bash
  set -euo pipefail
  if [ "{{ target }}" = "all" ]; then
    for pkg in {{ packages }}; do
      echo "Updating packages/$pkg..."
      pnpm --filter "$pkg" update --latest
    done
    echo "Updating root..."
    pnpm update --latest
  elif [ "{{ target }}" = "root" ]; then
    pnpm update --latest
  else
    pnpm --filter {{ target }} update --latest
  fi
  pnpm install

# ── Other ────────────────────────────────────────

clean:
  rm -rf node_modules .turbo
  for dir in packages/*; do rm -rf "$dir/dist" "$dir/node_modules" "$dir/.turbo"; done
