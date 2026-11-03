// Runs inside workerd without nodejs_compat, like a Worker that uses only web standards.
import { respond } from "./checks.mjs";

export default {
  fetch() {
    return respond();
  },
};
