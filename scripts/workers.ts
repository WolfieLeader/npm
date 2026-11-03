// Runs cipher-kit and compress-kit inside workerd, the Cloudflare Workers runtime: `pnpm workers`.
// Needs `pnpm build` first. It bundles the built packages with Wrangler's resolve conditions, like a Worker would.
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

// The pinned workerd's build date, so Dependabot's workerd bumps also move the compatibility date forward.
const compatibilityDate = /\d{4}-\d{2}-\d{2}/.exec(
  spawnSync("workerd", ["--version"], { encoding: "utf8" }).stdout,
)?.[0];
if (compatibilityDate === undefined) throw new Error("Could not read the workerd version");

const dir = mkdtempSync(path.join(tmpdir(), "workers-check-"));
try {
  await build({
    entryPoints: { web: "scripts/workers/worker.mjs", "nodejs-compat": "scripts/workers/compat.mjs" },
    outdir: dir,
    bundle: true,
    format: "esm",
    platform: "browser",
    conditions: ["workerd", "worker", "browser"],
    // Resolves `cipher-kit` and `compress-kit` to their workspace directories, so the built `dist` is tested.
    nodePaths: [fileURLToPath(new URL("../packages", import.meta.url))],
    external: ["node:*"],
    logLevel: "error",
  });
  copyFileSync("scripts/workers/config.capnp", path.join(dir, "config.capnp"));

  // `workerd test` calls each Worker's `test` handler and fails when one throws.
  const args = ["test", `--compat-date=${compatibilityDate}`, path.join(dir, "config.capnp")];
  const { status } = spawnSync("workerd", args, { stdio: "inherit" });
  if (status === 0) console.log("\n✔ Workers checks passed");
  else {
    console.error("\n✖ Workers checks failed");
    process.exitCode = status ?? 1;
  }
} finally {
  rmSync(dir, { recursive: true, force: true });
}
