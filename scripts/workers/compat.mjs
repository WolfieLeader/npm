// Runs inside workerd with nodejs_compat, which provides node:crypto. Adds the root entry and the Node kit.
// nodejs_compat is the default from compatibility date 2026-08-04, so no flag is needed.
import { nodeKit, webKit } from "cipher-kit";
import { NODE_CIPHERTEXT, SECRET, run } from "./checks.mjs";

export default {
  test() {
    return run({
      "nodeKit decrypts a Node ciphertext": () =>
        nodeKit.decrypt(NODE_CIPHERTEXT, nodeKit.createSecretKey(SECRET)) === "héllo 🌍 from Node",
      "nodeKit hashPassword at the deployed Workers PBKDF2 cap of 100,000 iterations": () => {
        const { result, salt } = nodeKit.hashPassword("correct horse", { iterations: 100_000 });
        return nodeKit.verifyPassword("correct horse", result, salt, { iterations: 100_000 });
      },
      "webKit decrypts nodeKit output": async () => {
        const ciphertext = nodeKit.encrypt("cross", nodeKit.createSecretKey(SECRET));
        return (await webKit.decrypt(ciphertext, await webKit.createSecretKey(SECRET))) === "cross";
      },
    });
  },
};
