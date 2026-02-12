workspace_packages := "cipher-kit compress-kit generate-certs get-client-ip modern-cookies @internal/helpers"
public_packages := "cipher-kit compress-kit generate-certs get-client-ip modern-cookies"

_default:
  just --list

# ── Workspace ────────────────────────────────────

[group('workspace')]
install:
  pnpm install

[group('workspace')]
build target="all":
  #!/usr/bin/env bash
  set -euo pipefail
  if [ "{{ target }}" = "all" ]; then
    pnpm turbo run build
  else
    pnpm --filter {{ target }} build
  fi

# ── Verify ───────────────────────────────────────

[group('verify')]
fmt target="all":
  #!/usr/bin/env bash
  set -euo pipefail
  if [ "{{ target }}" = "all" ]; then
    pnpm biome format --write .
    pnpm exec prettier --write "packages/*/README.md" README.md
  else
    pnpm --filter {{ target }} exec biome format --write .
  fi

[group('verify')]
lint target="all":
  #!/usr/bin/env bash
  set -euo pipefail
  if [ "{{ target }}" = "all" ]; then
    pnpm biome lint --fix
  else
    pnpm --filter {{ target }} exec biome lint --fix .
  fi

[group('verify')]
typecheck target="all":
  #!/usr/bin/env bash
  set -euo pipefail
  if [ "{{ target }}" = "all" ]; then
    pnpm turbo run typecheck
  else
    pnpm --filter {{ target }} typecheck
  fi

[group('verify')]
test target="all":
  #!/usr/bin/env bash
  set -euo pipefail
  if [ "{{ target }}" = "all" ]; then
    pnpm turbo run test
  else
    pnpm --filter {{ target }} test
  fi

[group('verify')]
smoke target="all":
  #!/usr/bin/env bash
  set -euo pipefail
  if [ "{{ target }}" = "all" ]; then
    bash scripts/run.sh
  else
    bash scripts/run.sh {{ target }}
  fi

[group('verify')]
attw target="all":
  #!/usr/bin/env bash
  set -euo pipefail

  if [ "{{ target }}" = "all" ]; then
    for pkg in {{ public_packages }}; do
      pnpm --filter "$pkg" exec attw --pack . --ignore-rules no-resolution
    done
    exit 0
  fi

  if [ "{{ target }}" = "@internal/helpers" ]; then
    echo "attw is not supported for private package: @internal/helpers"
    exit 1
  fi

  valid=false
  for pkg in {{ public_packages }}; do
    if [ "$pkg" = "{{ target }}" ]; then
      valid=true
      break
    fi
  done

  if [ "$valid" != "true" ]; then
    echo "Unknown public package: {{ target }}"
    echo "Available packages: {{ public_packages }}"
    exit 1
  fi

  pnpm --filter {{ target }} exec attw --pack . --ignore-rules no-resolution

[group('verify')]
verify target="all":
  just fmt {{ target }}
  just lint {{ target }}
  just typecheck {{ target }}

[group('verify')]
full-verify target="all":
  just verify {{ target }}
  just test {{ target }}
  if [ "{{ target }}" != "@internal/helpers" ]; then just attw {{ target }}; fi
  if [ "{{ target }}" != "@internal/helpers" ]; then just smoke {{ target }}; fi

# ── Maintenance ──────────────────────────────────

[group('maintenance')]
update target="all":
  #!/usr/bin/env bash
  set -euo pipefail
  if [ "{{ target }}" = "all" ]; then
    for pkg in {{ workspace_packages }}; do
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

[group('maintenance')]
clean:
  rm -rf node_modules .turbo
  for dir in packages/*; do rm -rf "$dir/dist" "$dir/node_modules" "$dir/.turbo"; done
