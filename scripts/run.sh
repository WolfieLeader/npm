#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
TMP_DIR="$(mktemp -d)"

cleanup() { rm -rf "$TMP_DIR"; }
trap cleanup EXIT

# Auto-discover package dirs (any subdir containing esm.mjs)
PKG_DIRS=()
for dir in "$SCRIPT_DIR"/*/; do
  [[ -f "${dir}esm.mjs" ]] && PKG_DIRS+=("$dir")
done

if [[ ${#PKG_DIRS[@]} -eq 0 ]]; then
  echo "No package test directories found"
  exit 1
fi

echo "==> Discovered ${#PKG_DIRS[@]} packages:"
for dir in "${PKG_DIRS[@]}"; do
  echo "    $(basename "$dir")"
done

get_pkg_dir() {
  local name="$1"
  for dir in "${PKG_DIRS[@]}"; do
    if [[ "$(basename "$dir")" == "$name" ]]; then
      printf "%s" "$dir"
      return 0
    fi
  done
  return 1
}

while [[ $# -gt 0 && "$1" == "--" ]]; do
  shift
done

SELECTED_PKGS=()
if [[ $# -eq 0 || "$1" == "all" ]]; then
  for dir in "${PKG_DIRS[@]}"; do
    SELECTED_PKGS+=("$(basename "$dir")")
  done
else
  for pkg in "$@"; do
    if ! get_pkg_dir "$pkg" >/dev/null; then
      echo "Unknown smoke package: $pkg"
      echo "Available packages:"
      for dir in "${PKG_DIRS[@]}"; do
        echo "  - $(basename "$dir")"
      done
      exit 1
    fi

    already_selected=false
    for selected in "${SELECTED_PKGS[@]:-}"; do
      if [[ "$selected" == "$pkg" ]]; then
        already_selected=true
        break
      fi
    done

    if [[ "$already_selected" == "false" ]]; then
      SELECTED_PKGS+=("$pkg")
    fi
  done
fi

echo ""
echo "==> Selected ${#SELECTED_PKGS[@]} package(s):"
for pkg in "${SELECTED_PKGS[@]}"; do
  echo "    $pkg"
done

# Versions come from the pnpm catalog, so the smoke test uses the same TypeScript and Node types as the repo.
# Usage: catalog_version <catalog> <package>; <catalog> is "default" or a name under `catalogs:`.
catalog_version() {
  local version
  version=$(awk -v cat="$1" -v pkg="$2" '
    /^catalog:/ { section = "default"; next }
    /^catalogs:/ { section = "named"; next }
    /^[^ ]/ { section = ""; next }
    section == "named" && /^  [^ ]/ { name = $1; sub(/:$/, "", name); next }
    section != "" {
      line = $0; sub(/^ +/, "", line); split(line, kv, ": ")
      key = kv[1]; gsub(/["\047]/, "", key)
      if (key == pkg && ((section == "default" && cat == "default") || (section == "named" && name == cat))) { print kv[2]; exit }
    }' "$ROOT_DIR/pnpm-workspace.yaml")
  if [[ -z "$version" ]]; then
    echo "No version for $2 in catalog $1 of pnpm-workspace.yaml" >&2
    exit 1
  fi
  printf "%s" "$version"
}

TS_VERSION=$(catalog_version default typescript)
TYPES_NODE_VERSION=$(catalog_version default @types/node)
EXPRESS_VERSION=$(catalog_version express5 express)
TYPES_EXPRESS_VERSION=$(catalog_version express5 @types/express)
echo "==> typescript@$TS_VERSION @types/node@$TYPES_NODE_VERSION express@$EXPRESS_VERSION @types/express@$TYPES_EXPRESS_VERSION"

echo ""
echo "==> Building selected packages (turbo replays cached builds)"
FILTERS=()
for pkg in "${SELECTED_PKGS[@]}"; do
  FILTERS+=("--filter=$pkg")
done
(cd "$ROOT_DIR" && pnpm exec turbo run build "${FILTERS[@]}" --output-logs=errors-only)

echo ""
echo "==> Packing tarballs into $TMP_DIR"

TARBALLS=()
for pkg in "${SELECTED_PKGS[@]}"; do
  tarball=$(npm pack "$ROOT_DIR/packages/$pkg" --pack-destination "$TMP_DIR" --ignore-scripts --silent | tail -1)
  TARBALLS+=("$TMP_DIR/$tarball")
done

echo "==> Installing tarballs"

cat > "$TMP_DIR/package.json" << 'EOF'
{ "name": "smoke-test", "private": true }
EOF

npm install --prefix "$TMP_DIR" \
  "${TARBALLS[@]}" \
  "express@$EXPRESS_VERSION" \
  "typescript@$TS_VERSION" \
  "@types/node@$TYPES_NODE_VERSION" \
  "@types/express@$TYPES_EXPRESS_VERSION" \
  --save-exact --silent --ignore-scripts --no-audit --no-fund

for pkg in "${SELECTED_PKGS[@]}"; do
  dir="$(get_pkg_dir "$pkg")"

  echo "==> [$pkg] Running ESM tests"
  cp "${dir}esm.mjs" "$TMP_DIR/"
  node "$TMP_DIR/esm.mjs"
  rm "$TMP_DIR/esm.mjs"

  echo "==> [$pkg] Running CJS tests"
  cp "${dir}cjs.cjs" "$TMP_DIR/"
  node "$TMP_DIR/cjs.cjs"
  rm "$TMP_DIR/cjs.cjs"
done

# Type resolution does not depend on the Node version under test, and TypeScript 7 cannot start on Node 20.0.
# The runtime matrix sets SMOKE_TYPES=0; the Checks job runs it.
if [[ "${SMOKE_TYPES:-1}" == "0" ]]; then
  echo ""
  echo "Smoke test passed! (type resolution skipped: SMOKE_TYPES=0)"
  exit 0
fi

echo "==> Running TypeScript type resolution (ESM and CJS consumers)"

# Each types.ts is checked twice: as .mts (import condition) and as .cts (require condition).
TYPE_FILES=()
for pkg in "${SELECTED_PKGS[@]}"; do
  dir="$(get_pkg_dir "$pkg")"
  if [[ -f "${dir}types.ts" ]]; then
    cp "${dir}types.ts" "$TMP_DIR/${pkg}-types.mts"
    cp "${dir}types.ts" "$TMP_DIR/${pkg}-types.cts"
    TYPE_FILES+=("${pkg}-types.mts" "${pkg}-types.cts")
  fi
done

if [[ ${#TYPE_FILES[@]} -gt 0 ]]; then
  INCLUDES=$(printf '"%s",' "${TYPE_FILES[@]}")
  INCLUDES="[${INCLUDES%,}]"

  cat > "$TMP_DIR/tsconfig.json" << EOF
{
  "compilerOptions": {
    "target": "ES2023",
    "module": "nodenext",
    "moduleResolution": "nodenext",
    "strict": true,
    "noEmit": true,
    "types": ["node"],
    "skipLibCheck": false
  },
  "include": ${INCLUDES}
}
EOF

  npx --prefix "$TMP_DIR" tsc --noEmit --project "$TMP_DIR/tsconfig.json"
else
  echo "No TypeScript smoke files found for selected package(s); skipping type resolution"
fi

echo ""
echo "Smoke test passed!"
