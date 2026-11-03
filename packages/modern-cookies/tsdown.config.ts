import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { defineConfig } from "tsdown";

// cookie v2 is ESM-only. Bundling it lets the CommonJS build run on Node versions without `require(esm)`.
// Its MIT license requires the notice to travel with the copy, so it heads every output file.
const cookieEntry = pathToFileURL(createRequire(import.meta.url).resolve("cookie"));
const cookieLicense = readFileSync(new URL("../LICENSE", cookieEntry), "utf8");

/** Prefixes each line with ` * ` for a block comment, without trailing spaces on blank lines. */
function $comment(text: string): string {
  return text
    .trimEnd()
    .split("\n")
    .map((line) => (line.trim() === "" ? " *" : ` * ${line}`))
    .join("\n");
}

export default defineConfig({
  entry: ["src/index.ts"],
  outDir: "dist",
  format: ["cjs", "esm"],
  // src passes isolatedDeclarations, so oxc emits declarations without the TypeScript compiler.
  dts: { generator: "oxc" },
  sourcemap: true,
  fixedExtension: false,
  // Bundle only cookie. The output may import Node built-ins and nothing else.
  deps: { onlyBundle: ["cookie"], onlyImport: [] },
  banner: { js: `/*!\n * Bundles cookie (https://github.com/jshttp/cookie):\n *\n${$comment(cookieLicense)}\n */` },
  publint: { level: "suggestion", strict: true },
  attw: { profile: "node16", level: "error" },
  failOnWarn: true,
  // Dual ESM and CJS output is deliberate.
  // Every other warning fails the build.
  suppressWarnings: [/We recommend using the ESM format/],
});
