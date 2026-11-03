import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/__tests__/**/*.test.ts"],
    // PBKDF2 runs 100k-320k iterations per call. On a shared CI runner, with every package testing at once,
    // two such tests took 5.6 s and 6.7 s against 0.5 s and 1.2 s on a laptop.
    testTimeout: 30_000,
  },
  resolve: {
    alias: {
      "~": path.resolve(import.meta.dirname, "src"),
    },
  },
});
