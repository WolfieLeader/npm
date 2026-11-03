import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts"],
  outDir: "dist",
  format: ["cjs", "esm"],
  // src passes isolatedDeclarations, so oxc emits declarations without the TypeScript compiler.
  dts: { generator: "oxc" },
  sourcemap: true,
  fixedExtension: false,
  // Bundle only the private helpers. The output may import pako and Node built-ins.
  deps: { onlyBundle: ["@internal/helpers"], onlyImport: ["pako"] },
  publint: { level: "suggestion", strict: true },
  attw: { profile: "node16", level: "error" },
  failOnWarn: true,
  // Dual ESM and CJS output is deliberate.
  // Every other warning fails the build.
  suppressWarnings: [/We recommend using the ESM format/],
});
