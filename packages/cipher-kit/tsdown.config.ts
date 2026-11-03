import { defineConfig } from "tsdown";

export default defineConfig({
  entry: {
    index: "src/export.ts",
    node: "src/node/export.ts",
    "web-api": "src/web/export.ts",
  },
  outDir: "dist",
  format: ["cjs", "esm"],
  // src passes isolatedDeclarations, so oxc emits declarations without the TypeScript compiler.
  dts: { generator: "oxc" },
  sourcemap: true,
  fixedExtension: false,
  // Bundle only the private helpers. The output may import Node built-ins and nothing else.
  deps: { onlyBundle: ["@internal/helpers"], onlyImport: [] },
  publint: { level: "suggestion", strict: true },
  attw: { profile: "node16", level: "error" },
  failOnWarn: true,
  // Dual ESM and CJS output is deliberate.
  // Every other warning fails the build.
  suppressWarnings: [/We recommend using the ESM format/],
});
