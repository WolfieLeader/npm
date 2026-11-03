// Custom oxlint rules for this repo. The root `.oxlintrc.json` loads this file through `jsPlugins` as `local`.
import type { Plugin } from "@oxlint/plugins";

import { noPlainSecretCompare } from "./no-plain-secret-compare.ts";

const plugin: Plugin = {
  meta: { name: "local" },
  rules: {
    "no-plain-secret-compare": noPlainSecretCompare,
  },
};

export default plugin;
