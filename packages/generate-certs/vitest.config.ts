import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/__tests__/**/*.test.ts"],
    // Each test generates RSA keys, whose time varies run to run. On a shared CI runner, with every package
    // testing at once, one test took 2.4 s against vitest's 5 s default.
    testTimeout: 30_000,
  },
  resolve: {
    alias: {
      "~": path.resolve(import.meta.dirname, "src"),
    },
  },
});
