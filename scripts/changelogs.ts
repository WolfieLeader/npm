// Fails when a published package's newest CHANGELOG.md heading is not its package.json version: `pnpm changelogs`.
// A release PR bumps the version and adds the entry together, so the two never drift.
import { readdirSync, readFileSync } from "node:fs";

const problems: string[] = [];
for (const dir of readdirSync("packages")) {
  const manifest: unknown = JSON.parse(readFileSync(`packages/${dir}/package.json`, "utf8"));
  if (typeof manifest !== "object" || manifest === null || !("version" in manifest)) continue;
  if ("private" in manifest && manifest.private === true) continue;
  const { version } = manifest;
  let changelog: string;
  try {
    changelog = readFileSync(`packages/${dir}/CHANGELOG.md`, "utf8");
  } catch {
    problems.push(`packages/${dir}: no CHANGELOG.md`);
    continue;
  }
  const newest = /^## (\S+)$/m.exec(changelog)?.[1];
  if (newest !== version) {
    problems.push(
      `packages/${dir}: package.json is ${String(version)}, CHANGELOG.md starts at ${newest ?? "no version"}`,
    );
  }
}

if (problems.length > 0) {
  console.error(`✖ Each package's newest CHANGELOG.md entry must match its version:\n${problems.join("\n")}`);
  process.exit(1);
}
console.log("✔ Changelogs match package versions");
