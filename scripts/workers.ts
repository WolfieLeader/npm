// Runs cipher-kit and compress-kit inside workerd, the Cloudflare Workers runtime: `pnpm workers`.
// Needs `pnpm build` first. It bundles the built packages with Wrangler's resolve conditions, like a Worker would.
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { Miniflare } from "miniflare";

const targets = [
  { label: "Workers", entry: "scripts/workers/worker.mjs", flags: [] },
  { label: "Workers with nodejs_compat", entry: "scripts/workers/compat.mjs", flags: ["nodejs_compat"] },
] as const;

async function $bundle(entry: string): Promise<string> {
  const { outputFiles } = await build({
    entryPoints: [entry],
    bundle: true,
    format: "esm",
    platform: "browser",
    conditions: ["workerd", "worker", "browser"],
    // Resolves `cipher-kit` and `compress-kit` to their workspace directories, so the built `dist` is tested.
    nodePaths: [fileURLToPath(new URL("../packages", import.meta.url))],
    external: ["node:*"],
    write: false,
    logLevel: "error",
  });
  const [output] = outputFiles;
  if (output === undefined) throw new Error(`esbuild produced no output for ${entry}`);
  return output.text;
}

/** Runs one Worker and prints its report. The Worker answers 200 only when every check passed. */
async function $check({ label, entry, flags }: (typeof targets)[number]): Promise<boolean> {
  const worker = new Miniflare({
    modules: true,
    script: await $bundle(entry),
    compatibilityDate: "2026-07-01",
    compatibilityFlags: [...flags],
  });
  try {
    const response = await worker.dispatchFetch("http://localhost/");
    console.log(`\n${label}\n${await response.text()}`);
    return response.ok;
  } finally {
    await worker.dispose();
  }
}

const passed = await Promise.all(targets.map($check));
if (!passed.every(Boolean)) {
  console.error("\n✖ Workers checks failed");
  process.exit(1);
}
console.log("\n✔ Workers checks passed");
