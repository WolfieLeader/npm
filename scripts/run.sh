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
  express@4.21.2 \
  typescript@5.9.3 \
  @types/node@25.2.2 \
  @types/express@5.0.2 \
  --save-exact --silent

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

echo "==> Running TypeScript type resolution"

TYPE_FILES=()
for pkg in "${SELECTED_PKGS[@]}"; do
  dir="$(get_pkg_dir "$pkg")"
  if [[ -f "${dir}types.ts" ]]; then
    cp "${dir}types.ts" "$TMP_DIR/${pkg}-types.ts"
    TYPE_FILES+=("${pkg}-types.ts")
  fi
done

if [[ ${#TYPE_FILES[@]} -gt 0 ]]; then
  INCLUDES=$(printf '"%s",' "${TYPE_FILES[@]}")
  INCLUDES="[${INCLUDES%,}]"

  cat > "$TMP_DIR/tsconfig.json" << EOF
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "nodenext",
    "moduleResolution": "nodenext",
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true
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
