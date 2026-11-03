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
      "nodeKit hmac matches webKit, and each verifies the other": async () => {
        const fromNode = nodeKit.hmac("héllo", SECRET, { digest: "sha512", length: 16 });
        const fromWeb = await webKit.hmac("héllo", SECRET, { digest: "sha512", length: 16 });
        return (
          fromNode === fromWeb &&
          nodeKit.verifyHmac("héllo", fromWeb, SECRET, { digest: "sha512", length: 16 }) &&
          (await webKit.verifyHmac("héllo", fromNode, SECRET, { digest: "sha512", length: 16 }))
        );
      },
      "nodeKit randomToken, randomCode and UUIDv7": () =>
        /^[\w-]{43}$/.test(nodeKit.randomToken()) &&
        /^\d{6}$/.test(nodeKit.randomCode()) &&
        /^[\da-f]{8}-[\da-f]{4}-7[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/.test(nodeKit.generateUuid({ version: 7 })),
      "webKit decrypts nodeKit output": async () => {
        const ciphertext = nodeKit.encrypt("cross", nodeKit.createSecretKey(SECRET));
        return (await webKit.decrypt(ciphertext, await webKit.createSecretKey(SECRET))) === "cross";
      },
    });
  },
};
