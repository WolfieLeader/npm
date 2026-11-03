import { KeyObject } from "node:crypto";
import { describe, expect, test } from "vitest";
import { nodeKit, webKit } from "~/export.js";
import { anyInstance, failure, secret } from "./__helpers__.js";

describe("Encryption Tests", () => {
  test("Node: Create Secret Key", () => {
    const key = nodeKit.tryCreateSecretKey(secret);
    expect(key).toStrictEqual({
      success: true,
      result: {
        platform: "node",
        digest: "sha256",
        algorithm: "aes256gcm",
        key: anyInstance(KeyObject),
        injected: { keyBytes: 32, node: "aes-256-gcm", web: "AES-GCM" },
      },
    });
    expect(key.result?.key.symmetricKeySize).toBe(32);
    expect(nodeKit.isNodeSecretKey(key.result)).toBe(true);
  });

  test("Web: Create Secret Key", async () => {
    const key = await webKit.tryCreateSecretKey(secret);
    expect(key).toStrictEqual({
      success: true,
      result: {
        platform: "web",
        digest: "sha256",
        algorithm: "aes256gcm",
        key: anyInstance(CryptoKey),
        injected: { keyBytes: 32, node: "aes-256-gcm", web: "AES-GCM" },
      },
    });
    expect(key.result?.key.algorithm).toStrictEqual({ name: "AES-GCM", length: 256 });
    expect(webKit.isWebSecretKey(key.result)).toBe(true);
  });

  test("Node: Same Input Same Secret Key Output", () => {
    const key1 = nodeKit.createSecretKey(secret).key.export();
    const key2 = nodeKit.createSecretKey(secret).key.export();
    expect(key1).toStrictEqual(key2);
  });

  test("Web: Same Input Same Secret Key Output", async () => {
    const opts = { extractable: true };
    const key1 = new Uint8Array(
      await globalThis.crypto.subtle.exportKey("raw", (await webKit.createSecretKey(secret, opts)).key),
    );
    const key2 = new Uint8Array(
      await globalThis.crypto.subtle.exportKey("raw", (await webKit.createSecretKey(secret, opts)).key),
    );
    expect(key1).toStrictEqual(key2);
  });

  test("Node: Different Input Different Secret Key Output", () => {
    const key1 = nodeKit.createSecretKey(secret).key.export();
    const key2 = nodeKit.createSecretKey(`${secret}!`).key.export();
    expect(key1).not.toStrictEqual(key2);
  });

  test("Web: Different Input Different Secret Key Output", async () => {
    const opts = { extractable: true };
    const key1 = new Uint8Array(
      await globalThis.crypto.subtle.exportKey("raw", (await webKit.createSecretKey(secret, opts)).key),
    );
    const key2 = new Uint8Array(
      await globalThis.crypto.subtle.exportKey("raw", (await webKit.createSecretKey(`${secret}!`, opts)).key),
    );
    expect(key1).not.toStrictEqual(key2);
  });

  test("Fail: Empty Secret Key", async () => {
    const nodeKey = nodeKit.tryCreateSecretKey("");
    expect(nodeKey).toStrictEqual(
      failure(
        "node createSecretKey: Secret must be at least 8 characters",
        "Use a high-entropy, well-formed string of at least 8 non-whitespace characters",
      ),
    );

    const webKey = await webKit.tryCreateSecretKey("");
    expect(webKey).toStrictEqual(
      failure(
        "web createSecretKey: Secret must be at least 8 characters",
        "Use a high-entropy, well-formed string of at least 8 non-whitespace characters",
      ),
    );
  });

  test("Fail: Short Secret Key", async () => {
    const nodeKey = nodeKit.tryCreateSecretKey("short");
    expect(nodeKey).toStrictEqual(
      failure(
        "node createSecretKey: Secret must be at least 8 characters",
        "Use a high-entropy, well-formed string of at least 8 non-whitespace characters",
      ),
    );

    const webKey = await webKit.tryCreateSecretKey("short");
    expect(webKey).toStrictEqual(
      failure(
        "web createSecretKey: Secret must be at least 8 characters",
        "Use a high-entropy, well-formed string of at least 8 non-whitespace characters",
      ),
    );
  });

  test("Fail: Invalid Options", async () => {
    // @ts-expect-error -- options must be an object; checks runtime validation
    const nodeKey = nodeKit.tryCreateSecretKey(secret, 3.14);
    expect(nodeKey).toStrictEqual(
      failure("node createSecretKey: Options must be a plain object", 'Pass an object like { algorithm: "aes256gcm" }'),
    );

    // @ts-expect-error -- options must be an object; checks runtime validation
    const webKey = await webKit.tryCreateSecretKey(secret, 3.14);
    expect(webKey).toStrictEqual(
      failure("web createSecretKey: Options must be a plain object", 'Pass an object like { algorithm: "aes256gcm" }'),
    );
  });

  test("Fail: Short Salt", async () => {
    const nodeKey = nodeKit.tryCreateSecretKey(secret, { salt: "short" });
    expect(nodeKey).toStrictEqual(
      failure(
        "node createSecretKey: Salt must be at least 8 characters",
        "Provide a well-formed salt string with at least 8 non-whitespace characters",
      ),
    );

    const webKey = await webKit.tryCreateSecretKey(secret, { salt: "short" });
    expect(webKey).toStrictEqual(
      failure(
        "web createSecretKey: Salt must be at least 8 characters",
        "Provide a well-formed salt string with at least 8 non-whitespace characters",
      ),
    );
  });

  test("Fail: Invalid Algorithm", async () => {
    // @ts-expect-error -- unsupported algorithm on purpose; checks runtime validation
    const nodeKey = nodeKit.tryCreateSecretKey(secret, { algorithm: "invalid-algo" });
    expect(nodeKey).toStrictEqual(
      failure(
        "node createSecretKey: Unsupported algorithm",
        "Supported algorithms are: aes256gcm, aes192gcm, aes128gcm",
      ),
    );

    // @ts-expect-error -- unsupported algorithm on purpose; checks runtime validation
    const webKey = await webKit.tryCreateSecretKey(secret, { algorithm: "invalid-algo" });
    expect(webKey).toStrictEqual(
      failure(
        "web createSecretKey: Unsupported algorithm",
        "Supported algorithms are: aes256gcm, aes192gcm, aes128gcm",
      ),
    );
  });

  test("Fail: Invalid Digest", async () => {
    // @ts-expect-error -- unsupported digest on purpose; checks runtime validation
    const nodeKey = nodeKit.tryCreateSecretKey(secret, { digest: "invalid-algo" });
    expect(nodeKey).toStrictEqual(
      failure("node createSecretKey: Unsupported digest", "Supported digests are: sha256, sha384, sha512"),
    );

    // @ts-expect-error -- unsupported digest on purpose; checks runtime validation
    const webKey = await webKit.tryCreateSecretKey(secret, { digest: "invalid-algo" });
    expect(webKey).toStrictEqual(
      failure("web createSecretKey: Unsupported digest", "Supported digests are: sha256, sha384, sha512"),
    );
  });

  test("Fail: Forgery attempt with plain object key is rejected", () => {
    const forgedNode = {
      platform: "node",
      digest: "sha256",
      algorithm: "aes256gcm",
      key: { type: "secret", symmetricKeySize: 32 },
      injected: { keyBytes: 32, node: "aes-256-gcm", web: "AES-GCM" },
    };
    expect(nodeKit.isNodeSecretKey(forgedNode)).toBe(false);

    const forgedWeb = {
      platform: "web",
      digest: "sha256",
      algorithm: "aes256gcm",
      key: {
        type: "secret",
        algorithm: { name: "AES-GCM", length: 256 },
        usages: ["encrypt", "decrypt"],
      },
      injected: { keyBytes: 32, node: "aes-256-gcm", web: "AES-GCM" },
    };
    expect(webKit.isWebSecretKey(forgedWeb)).toBe(false);
  });
});
