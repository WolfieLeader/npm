#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
TMP_DIR="$(mktemp -d)"

cleanup() { rm -rf "$TMP_DIR"; }
trap cleanup EXIT

echo "==> Packing tarballs into $TMP_DIR"

PACKAGES=(cipher-kit compress-kit generate-certs get-client-ip modern-cookies)
TARBALLS=()

for pkg in "${PACKAGES[@]}"; do
  tarball=$(npm pack "$ROOT_DIR/packages/$pkg" --pack-destination "$TMP_DIR" --ignore-scripts --silent)
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

echo "==> Running ESM import validation"
cp "$SCRIPT_DIR/validate.mjs" "$TMP_DIR/"
node "$TMP_DIR/validate.mjs"

echo "==> Running ESM functional tests"
cp "$SCRIPT_DIR/esm.mjs" "$TMP_DIR/"
node "$TMP_DIR/esm.mjs"

echo "==> Running CJS import validation"
cp "$SCRIPT_DIR/validate.cjs" "$TMP_DIR/"
node "$TMP_DIR/validate.cjs"

echo "==> Running CJS functional tests"
cp "$SCRIPT_DIR/cjs.cjs" "$TMP_DIR/"
node "$TMP_DIR/cjs.cjs"

echo "==> Running TypeScript type resolution"
cp "$SCRIPT_DIR/types.ts" "$TMP_DIR/"
cat > "$TMP_DIR/tsconfig.json" << 'EOF'
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "nodenext",
    "moduleResolution": "nodenext",
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true
  },
  "include": ["types.ts"]
}
EOF
npx --prefix "$TMP_DIR" tsc --noEmit --project "$TMP_DIR/tsconfig.json"

echo ""
echo "Smoke test passed!"
