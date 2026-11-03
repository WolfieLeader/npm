// Type-checks every package against the Node.js types of engines.node's floor (@types/node 20): part of `pnpm typecheck`.
// @types/node 26 lets code call APIs that Node 20.19 lacks; this check fails on them when they are written.
// Needs the package builds that `turbo run typecheck` makes first.
import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import path from "node:path";

const floor = path.resolve("tools/node-floor");
const flags = [
  "--noEmit",
  "--typeRoots",
  `${path.join(floor, "node_modules/@types")},${path.join(floor, "types")}`,
  "--types",
  "node,node-floor-globals",
];
const tsc = path.resolve("node_modules/.bin/tsc");

const failed: string[] = [];
for (const dir of readdirSync("packages")) {
  const { status } = spawnSync(tsc, ["-p", `packages/${dir}/tsconfig.json`, ...flags], { stdio: "inherit" });
  if (status !== 0) failed.push(dir);
}

if (failed.length > 0) {
  console.error(`✖ Uses APIs or types missing from the engines.node floor's @types/node: ${failed.join(", ")}`);
  process.exit(1);
}
console.log("✔ Every package type-checks against the engines.node floor");
