import { defineConfig, type Options } from "tsup";

export default defineConfig((options: Options) => ({
  name: "cipher-kit",
  entry: {
    index: "src/export.ts",
    node: "src/node/export.ts",
    "web-api": "src/web/export.ts",
  },
  outDir: "dist",
  format: ["cjs", "esm"],
  clean: true,
  dts: true,
  sourcemap: true,
  treeshake: true,
  splitting: true,
  minify: false,
  cjsInterop: true,
  tsconfig: "tsconfig.json",
  skipNodeModulesBundle: true,
  ...options,
}));
