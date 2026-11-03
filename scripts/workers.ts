// Runs cipher-kit and compress-kit inside workerd, the Cloudflare Workers runtime: `pnpm workers`.
// Needs `pnpm build` first. It bundles the built packages with Wrangler's resolve conditions, like a Worker would.
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

// nodejs_compat is on by default from compatibility date 2026-08-04. The web Worker turns it off.
const workers = [
  { name: "web", entry: "scripts/workers/worker.mjs", flags: ["no_nodejs_compat", "no_nodejs_compat_v2"] },
  { name: "nodejs-compat", entry: "scripts/workers/compat.mjs", flags: [] },
] as const;

// The pinned workerd's build date, so Dependabot's workerd bumps also move the compatibility date forward.
const compatibilityDate = /\d{4}-\d{2}-\d{2}/.exec(
  spawnSync("workerd", ["--version"], { encoding: "utf8" }).stdout,
)?.[0];
if (compatibilityDate === undefined) throw new Error("Could not read the workerd version");

const dir = mkdtempSync(path.join(tmpdir(), "workers-check-"));
try {
  await build({
    entryPoints: Object.fromEntries(workers.map(({ name, entry }) => [name, entry])),
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

  // `workerd test` calls each Worker's `test` handler and fails when one throws.
  const services = workers.map(({ name }) => `(name = "${name}", worker = .${name.replace("-", "")})`).join(", ");
  const definitions = workers.map(
    ({ name, flags }) =>
      `const ${name.replace("-", "")} :Workerd.Worker = (\n` +
      `  modules = [(name = "worker", esModule = embed "${name}.js")],\n` +
      `  compatibilityDate = "${compatibilityDate}",\n` +
      `  compatibilityFlags = [${flags.map((flag) => `"${flag}"`).join(", ")}],\n);`,
  );
  const config = [
    'using Workerd = import "/workerd/workerd.capnp";',
    `const config :Workerd.Config = (services = [${services}]);`,
    ...definitions,
  ].join("\n\n");
  writeFileSync(path.join(dir, "config.capnp"), `${config}\n`);

  const { status } = spawnSync("workerd", ["test", path.join(dir, "config.capnp")], { stdio: "inherit" });
  if (status === 0) console.log("\n✔ Workers checks passed");
  else {
    console.error("\n✖ Workers checks failed");
    process.exitCode = status ?? 1;
  }
} finally {
  rmSync(dir, { recursive: true, force: true });
}
