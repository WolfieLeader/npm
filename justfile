packages := "cipher-kit compress-kit generate-certs get-client-ip modern-cookies"
examples := "server-express server-nestjs"

_default:
  just --list

# ── Dev ──────────────────────────────────────────

[group('dev')]
install:
  pnpm install

[group('dev')]
build:
  pnpm build

[group('dev')]
dev server:
  pnpm --filter server-{{ server }} dev

# ── Verify ───────────────────────────────────────

[group('verify')]
fmt:
  pnpm biome format --write .

[group('verify')]
lint:
  pnpm biome lint --fix .

[group('verify')]
typecheck:
  pnpm typecheck

[group('verify')]
test target="all":
  #!/usr/bin/env bash
  set -euo pipefail
  if [ "{{ target }}" = "all" ]; then
    pnpm --filter cipher-kit test
    pnpm --filter compress-kit test
  else
    pnpm --filter {{ target }} test
  fi

[group('verify')]
verify: typecheck fmt lint

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
    for ex in {{ examples }}; do
      echo "Updating examples/$ex..."
      pnpm --filter "$ex" update --latest
    done
    echo "Updating root..."
    pnpm update --latest
  elif [ "{{ target }}" = "root" ]; then
    pnpm update --latest
  else
    pnpm --filter {{ target }} update --latest
  fi
  pnpm install

# ── Publish ──────────────────────────────────────

[group('publish')]
bump package bump:
  #!/usr/bin/env bash
  set -euo pipefail
  valid_packages="{{ packages }}"
  if ! echo "$valid_packages" | grep -qw "{{ package }}"; then
    echo "Error: '{{ package }}' is not a valid package. Choose from: $valid_packages"
    exit 1
  fi
  valid_bumps="patch minor major"
  if ! echo "$valid_bumps" | grep -qw "{{ bump }}"; then
    echo "Error: '{{ bump }}' is not a valid bump type. Choose from: $valid_bumps"
    exit 1
  fi
  cd packages/{{ package }}
  npm version {{ bump }} --no-git-tag-version
  version=$(node -p "require('./package.json').version")
  echo "Bumped {{ package }} to $version"

[group('publish')]
bump-beta package:
  #!/usr/bin/env bash
  set -euo pipefail
  valid_packages="{{ packages }}"
  if ! echo "$valid_packages" | grep -qw "{{ package }}"; then
    echo "Error: '{{ package }}' is not a valid package. Choose from: $valid_packages"
    exit 1
  fi
  cd packages/{{ package }}
  npm version prerelease --preid beta --no-git-tag-version
  version=$(node -p "require('./package.json').version")
  echo "Bumped {{ package }} to $version (beta)"

[group('publish')]
publish package:
  #!/usr/bin/env bash
  set -euo pipefail
  valid_packages="{{ packages }}"
  if ! echo "$valid_packages" | grep -qw "{{ package }}"; then
    echo "Error: '{{ package }}' is not a valid package. Choose from: $valid_packages"
    exit 1
  fi
  pnpm build
  cd packages/{{ package }}
  version=$(node -p "require('./package.json').version")
  pnpm publish --no-git-checks
  cd ..
  git add packages/{{ package }}/package.json
  git commit -m "{{ package }}@$version"
  git tag "{{ package }}@$version"
  echo "Published {{ package }}@$version"
  echo "Run 'git push && git push --tags' when ready."

[group('publish')]
publish-beta package:
  #!/usr/bin/env bash
  set -euo pipefail
  valid_packages="{{ packages }}"
  if ! echo "$valid_packages" | grep -qw "{{ package }}"; then
    echo "Error: '{{ package }}' is not a valid package. Choose from: $valid_packages"
    exit 1
  fi
  pnpm build
  cd packages/{{ package }}
  version=$(node -p "require('./package.json').version")
  pnpm publish --tag beta --no-git-checks
  cd ..
  git add packages/{{ package }}/package.json
  git commit -m "{{ package }}@$version"
  git tag "{{ package }}@$version"
  echo "Published {{ package }}@$version (beta)"
  echo "Run 'git push && git push --tags' when ready."

# ── Other ────────────────────────────────────────

clean:
  rm -rf node_modules .turbo
  for dir in packages/* examples/*; do rm -rf "$dir/dist" "$dir/node_modules" "$dir/.turbo"; done
