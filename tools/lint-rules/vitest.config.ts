import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/__tests__/**/*.test.ts"],
    // Each test spawns oxlint, which loads the plugin from source.
    testTimeout: 30_000,
  },
});
