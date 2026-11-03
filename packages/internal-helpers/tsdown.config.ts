import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts"],
  outDir: "dist",
  format: ["cjs", "esm"],
  // src passes isolatedDeclarations, so oxc emits declarations without the TypeScript compiler.
  dts: { generator: "oxc" },
  sourcemap: true,
  fixedExtension: false,
  // Private: bundled into cipher-kit and compress-kit, never published.
  deps: { neverBundle: true, onlyImport: [] },
  failOnWarn: true,
  // Dual ESM and CJS output is deliberate.
  // Every other warning fails the build.
  suppressWarnings: [/We recommend using the ESM format/],
});
