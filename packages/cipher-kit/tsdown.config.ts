import { defineConfig } from "tsdown";

export default defineConfig({
  entry: {
    index: "src/export.ts",
    node: "src/node/export.ts",
    "web-api": "src/web/export.ts",
  },
  outDir: "dist",
  format: ["cjs", "esm"],
  dts: true,
  sourcemap: true,
  fixedExtension: false,
});
