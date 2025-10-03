import { describe, expect, test } from "vitest";
import { matchPattern, nodeKit, type SecretKey, webKit } from "~/export";

const secret = "Secret0123456789Secret0123456789";
const data = "🦊 secret stuff ~ !@#$%^&*()_+";

describe("Integration Tests - Full Workflow", () => {
  test("Complete encryption workflow with default options", async () => {
    // Node workflow
    let nodeSecretKey: SecretKey<"node">;
    const nodeKey = nodeKit.tryCreateSecretKey(secret);
    expect(nodeKey.success).toBe(true);
    expect(nodeKey.result).toBeDefined();
    expect(nodeKit.isNodeSecretKey(nodeKey.result)).toBe(true);
    nodeSecretKey = nodeKey.result as SecretKey<"node">;

    // Web workflow
    let webSecretKey: SecretKey<"web">;
    const webKey = await webKit.tryCreateSecretKey(secret);
    expect(webKey.success).toBe(true);
    expect(webKey.result).toBeDefined();
    expect(webKit.isWebSecretKey(webKey.result)).toBe(true);
    webSecretKey = webKey.result as SecretKey<"web">;

    const encryptedNode = nodeKit.tryEncrypt(data, nodeSecretKey);
    expect(encryptedNode.success).toBe(true);
    expect(encryptedNode.result).toBeDefined();
    expect(matchPattern(encryptedNode.result as string, "node")).toBe(true);

    const encryptedWeb = await webKit.tryEncrypt(data, webSecretKey);
    expect(encryptedWeb.success).toBe(true);
    expect(encryptedWeb.result).toBeDefined();
    expect(matchPattern(encryptedWeb.result as string, "web")).toBe(true);

    expect(encryptedNode.result).not.toBe(encryptedWeb.result);

    const decryptedNode = nodeKit.tryDecrypt(encryptedNode.result as string, nodeSecretKey);
    expect(decryptedNode.success).toBe(true);
    expect(decryptedNode.result).toBe(data);

    const decryptedWeb = await webKit.tryDecrypt(encryptedWeb.result as string, webSecretKey);
    expect(decryptedWeb.success).toBe(true);
    expect(decryptedWeb.result).toBe(data);

    expect(decryptedNode.result).toBe(decryptedWeb.result);

    const encryptedNode2 = nodeKit.tryEncrypt(data, nodeSecretKey);
    expect(encryptedNode2.success).toBe(true);
    expect(encryptedNode2.result).toBeDefined();
    expect(encryptedNode2.result).not.toBe(encryptedNode.result);

    const encryptedWeb2 = await webKit.tryEncrypt(data, webSecretKey);
    expect(encryptedWeb2.success).toBe(true);
    expect(encryptedWeb2.result).toBeDefined();
    expect(encryptedWeb2.result).not.toBe(encryptedWeb.result);

    const encryptedObjNode = nodeKit.tryEncryptObj(largeObj, nodeSecretKey);
    expect(encryptedObjNode.success).toBe(true);
    expect(encryptedObjNode.result).toBeDefined();
    expect(matchPattern(encryptedObjNode.result as string, "node")).toBe(true);

    const encryptedObjWeb = await webKit.tryEncryptObj(largeObj, webSecretKey);
    expect(encryptedObjWeb.success).toBe(true);
    expect(encryptedObjWeb.result).toBeDefined();
    expect(matchPattern(encryptedObjWeb.result as string, "web")).toBe(true);

    expect(encryptedObjNode.result).not.toBe(encryptedObjWeb.result);

    const decryptedObjNode = nodeKit.tryDecryptObj<typeof largeObj>(encryptedObjNode.result as string, nodeSecretKey);
    expect(decryptedObjNode.success).toBe(true);
    expect(decryptedObjNode.result).toEqual(largeObj);

    const decryptedObjWeb = await webKit.tryDecryptObj<typeof largeObj>(encryptedObjWeb.result as string, webSecretKey);
    expect(decryptedObjWeb.success).toBe(true);
    expect(decryptedObjWeb.result).toEqual(largeObj);
  });

  test("Complete encryption workflow with AES-128-GCM", async () => {
    // Node workflow
    let nodeSecretKey: SecretKey<"node">;
    const nodeKey = nodeKit.tryCreateSecretKey(secret, { algorithm: "aes128gcm" });
    expect(nodeKey.success).toBe(true);
    expect(nodeKey.result).toBeDefined();
    expect(nodeKit.isNodeSecretKey(nodeKey.result)).toBe(true);
    nodeSecretKey = nodeKey.result as SecretKey<"node">;

    // Web workflow
    let webSecretKey: SecretKey<"web">;
    const webKey = await webKit.tryCreateSecretKey(secret, { algorithm: "aes128gcm" });
    expect(webKey.success).toBe(true);
    expect(webKey.result).toBeDefined();
    expect(webKit.isWebSecretKey(webKey.result)).toBe(true);
    webSecretKey = webKey.result as SecretKey<"web">;

    const encryptedNode = nodeKit.tryEncrypt(data, nodeSecretKey, { encoding: "hex" });
    expect(encryptedNode.success).toBe(true);
    expect(encryptedNode.result).toBeDefined();
    expect(matchPattern(encryptedNode.result as string, "node")).toBe(true);

    const encryptedWeb = await webKit.tryEncrypt(data, webSecretKey, { encoding: "hex" });
    expect(encryptedWeb.success).toBe(true);
    expect(encryptedWeb.result).toBeDefined();
    expect(matchPattern(encryptedWeb.result as string, "web")).toBe(true);

    expect(encryptedNode.result).not.toBe(encryptedWeb.result);

    const decryptedNode = nodeKit.tryDecrypt(encryptedNode.result as string, nodeSecretKey, { encoding: "hex" });
    expect(decryptedNode.success).toBe(true);
    expect(decryptedNode.result).toBe(data);

    const decryptedWeb = await webKit.tryDecrypt(encryptedWeb.result as string, webSecretKey, { encoding: "hex" });
    expect(decryptedWeb.success).toBe(true);
    expect(decryptedWeb.result).toBe(data);

    expect(decryptedNode.result).toBe(decryptedWeb.result);

    const encryptedNode2 = nodeKit.tryEncrypt(data, nodeSecretKey, { encoding: "hex" });
    expect(encryptedNode2.success).toBe(true);
    expect(encryptedNode2.result).toBeDefined();
    expect(encryptedNode2.result).not.toBe(encryptedNode.result);

    const encryptedWeb2 = await webKit.tryEncrypt(data, webSecretKey, { encoding: "hex" });
    expect(encryptedWeb2.success).toBe(true);
    expect(encryptedWeb2.result).toBeDefined();
    expect(encryptedWeb2.result).not.toBe(encryptedWeb.result);

    const encryptedObjNode = nodeKit.tryEncryptObj(largeObj, nodeSecretKey, { encoding: "base64" });
    expect(encryptedObjNode.success).toBe(true);
    expect(encryptedObjNode.result).toBeDefined();
    expect(matchPattern(encryptedObjNode.result as string, "node")).toBe(true);

    const encryptedObjWeb = await webKit.tryEncryptObj(largeObj, webSecretKey, { encoding: "base64" });
    expect(encryptedObjWeb.success).toBe(true);
    expect(encryptedObjWeb.result).toBeDefined();
    expect(matchPattern(encryptedObjWeb.result as string, "web")).toBe(true);

    expect(encryptedObjNode.result).not.toBe(encryptedObjWeb.result);

    const decryptedObjNode = nodeKit.tryDecryptObj<typeof largeObj>(encryptedObjNode.result as string, nodeSecretKey, {
      encoding: "base64",
    });
    expect(decryptedObjNode.success).toBe(true);
    expect(decryptedObjNode.result).toEqual(largeObj);

    const decryptedObjWeb = await webKit.tryDecryptObj<typeof largeObj>(
      encryptedObjWeb.result as string,
      webSecretKey,
      { encoding: "base64" },
    );
    expect(decryptedObjWeb.success).toBe(true);
    expect(decryptedObjWeb.result).toEqual(largeObj);
  });

  test("Encoding conversion consistency", () => {
    expect(nodeKit.convertEncoding(data, "utf8", "base64")).toBe(webKit.convertEncoding(data, "utf8", "base64"));
    expect(nodeKit.convertEncoding(data, "utf8", "hex")).toBe(webKit.convertEncoding(data, "utf8", "hex"));
    expect(nodeKit.convertEncoding(data, "utf8", "base64url")).toBe(webKit.convertEncoding(data, "utf8", "base64url"));
    expect(nodeKit.convertEncoding(data, "utf8", "latin1")).toBe(webKit.convertEncoding(data, "utf8", "latin1"));
  });

  test("Hash consistency across platforms", async () => {
    expect(nodeKit.hash(data, { digest: "sha256" })).toBe(await webKit.hash(data, { digest: "sha256" }));
    expect(nodeKit.hash(data, { digest: "sha384" })).toBe(await webKit.hash(data, { digest: "sha384" }));
    expect(nodeKit.hash(data, { digest: "sha512" })).toBe(await webKit.hash(data, { digest: "sha512" }));
  });

  test("Password hashing and verification workflow", async () => {
    const password = "SuperSecretPassword!";

    const nodeHash = nodeKit.tryHashPassword(password);
    expect(nodeHash.success).toBe(true);
    expect(nodeHash.hash).toBeDefined();
    expect(nodeHash.salt).toBeDefined();

    const webHash = await webKit.tryHashPassword(password);
    expect(webHash.success).toBe(true);
    expect(webHash.hash).toBeDefined();
    expect(webHash.salt).toBeDefined();

    expect(nodeHash.hash).not.toBe(webHash.hash);
    expect(nodeHash.salt).not.toBe(webHash.salt);

    const nodeVerify = nodeKit.verifyPassword(password, nodeHash.hash as string, nodeHash.salt as string);
    expect(nodeVerify).toBe(true);

    const webVerify = await webKit.verifyPassword(password, webHash.hash as string, webHash.salt as string);
    expect(webVerify).toBe(true);

    const nodeVerifyWrong = nodeKit.verifyPassword(
      "SuperSecredPassword",
      nodeHash.hash as string,
      nodeHash.salt as string,
    );
    expect(nodeVerifyWrong).toBe(false);

    const webVerifyWrong = await webKit.verifyPassword(
      "SuperSecredPassword",
      webHash.hash as string,
      webHash.salt as string,
    );
    expect(webVerifyWrong).toBe(false);
  });
});

const largeObj = {
  user: {
    id: "user_1234567890",
    name: "John Doe",
    email: "john.doe@example.com",
    isActive: true,
    preferences: {
      theme: "dark",
      language: "en-US",
      notifications: {
        email: true,
        sms: false,
        push: true,
      },
    },
    roles: ["admin", "editor", "user"],
    stats: {
      posts: 234,
      comments: 876,
      likes: 4321,
      lastLogin: new Date().toISOString(),
    },
    address: {
      street: "1234 Main St",
      city: "Metropolis",
      state: "CA",
      zip: "90210",
      geo: { lat: 34.0522, lng: -118.2437 },
    },
  },
  metadata: {
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tags: Array.from({ length: 100 }, (_, i) => `tag_${i}`),
    notes: Array.from({ length: 50 }, (_, i) => ({
      id: `note_${i}`,
      title: `Note ${i}`,
      content: `This is the content of note number ${i}`,
      pinned: i % 3 === 0,
    })),
  },
  config: {
    features: {
      featureA: true,
      featureB: false,
      featureC: true,
      experimental: { newUI: false, searchV2: true },
    },
    limits: { maxItems: 1000, timeout: 3000, retries: 5 },
  },
  session: {
    token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    expiresIn: 3600,
    refreshToken: "ref_123456789",
  },
  logs: Array.from({ length: 200 }, (_, i) => ({
    timestamp: new Date(Date.now() - i * 1000).toISOString(),
    message: `Log message number ${i}`,
    level: ["info", "warn", "error"][i % 3],
  })),
};
