// Runs inside workerd with nodejs_compat, which provides node:crypto. Adds the root entry and the Node kit.
import { nodeKit, webKit } from "cipher-kit";
import { NODE_CIPHERTEXT, SECRET, respond } from "./checks.mjs";

export default {
  fetch() {
    return respond({
      "nodeKit decrypts a Node ciphertext": () =>
        nodeKit.decrypt(NODE_CIPHERTEXT, nodeKit.createSecretKey(SECRET)) === "héllo 🌍 from Node",
      "nodeKit hashPassword with the default iterations": () => {
        const { result, salt } = nodeKit.hashPassword("correct horse");
        return nodeKit.verifyPassword("correct horse", result, salt);
      },
      "webKit decrypts nodeKit output": async () => {
        const ciphertext = nodeKit.encrypt("cross", nodeKit.createSecretKey(SECRET));
        return (await webKit.decrypt(ciphertext, await webKit.createSecretKey(SECRET))) === "cross";
      },
    });
  },
};
