// Runs inside workerd without nodejs_compat, like a Worker that uses only web standards.
import { run } from "./checks.mjs";

export default {
  test() {
    return run({
      // Proves the flags took effect: with nodejs_compat, both globals exist.
      "runs without Node.js globals": () => !("Buffer" in globalThis) && !("process" in globalThis),
    });
  },
};
