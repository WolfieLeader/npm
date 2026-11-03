// Runs CI's checks in order and stops at the first failure: `pnpm verify`.
// The Node version matrix and the scheduled security scans run only in CI.
import { spawnSync } from "node:child_process";

const steps = ["fmt:check", "lint", "typecheck", "test", "build", "smoke", "workers", "changelogs", "knip"] as const;

// CI runs these binaries too. Running them here catches most of what those CI jobs catch; zizmor's online
// audits and the security workflow run only in CI.
const tools: readonly (readonly [name: string, args: readonly string[]])[] = [
  ["gitleaks", ["git", "--redact", "--no-banner", "--config", ".gitleaks.toml", "."]],
  ["actionlint", []],
  ["zizmor", ["--offline", "--min-severity", "medium", "."]],
];

function $run(command: string, args: readonly string[]): void {
  console.log(`\n▶ ${[command, ...args].join(" ")}`);
  const { status } = spawnSync(command, args, { stdio: "inherit" });
  if (status !== 0) {
    console.error(`\n✖ ${[command, ...args].join(" ")} failed (exit ${String(status)}).`);
    process.exit(status ?? 1);
  }
}

for (const step of steps) $run("pnpm", ["run", step]);

const skipped: string[] = [];
for (const [name, args] of tools) {
  if (spawnSync(name, ["--version"], { stdio: "ignore" }).error) skipped.push(name);
  else $run(name, args);
}

if (skipped.length > 0) console.warn(`\n⚠ Not installed, so only CI checks: ${skipped.join(", ")}.`);
console.log("\n✔ verify passed");
