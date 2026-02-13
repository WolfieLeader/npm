/** biome-ignore-all lint/suspicious/noTsIgnore: Required for tests */
import { describe, expect, test } from "vitest";
import { nodeKit, webKit } from "~/export.js";
import { secret } from "./__helpers__.js";

describe("Encryption Tests", () => {
  test("Node: Create Secret Key", () => {
    const key = nodeKit.tryCreateSecretKey(secret);
    expect(key.success).toBeTruthy();
    expect(key.error).toBeUndefined();
    expect(key.result).toBeDefined();
    expect(nodeKit.isNodeSecretKey(key.result)).toBeTruthy();
  });

  test("Web: Create Secret Key", async () => {
    const key = await webKit.tryCreateSecretKey(secret);
    expect(key.success).toBeTruthy();
    expect(key.error).toBeUndefined();
    expect(key.result).toBeDefined();
    expect(webKit.isWebSecretKey(key.result)).toBeTruthy();
  });

  test("Node: Same Input Same Secret Key Output", () => {
    const key1 = nodeKit.createSecretKey(secret).key.export();
    const key2 = nodeKit.createSecretKey(secret).key.export();
    expect(key1).toEqual(key2);
  });

  test("Web: Same Input Same Secret Key Output", async () => {
    const opts = { extractable: true };
    const key1 = new Uint8Array(await globalThis.crypto.subtle.exportKey("raw", (await webKit.createSecretKey(secret, opts)).key));
    const key2 = new Uint8Array(await globalThis.crypto.subtle.exportKey("raw", (await webKit.createSecretKey(secret, opts)).key));
    expect(key1).toEqual(key2);
  });

  test("Node: Different Input Different Secret Key Output", () => {
    const key1 = nodeKit.createSecretKey(secret).key.export();
    const key2 = nodeKit.createSecretKey(`${secret}!`).key.export();
    expect(key1).not.toEqual(key2);
  });

  test("Web: Different Input Different Secret Key Output", async () => {
    const opts = { extractable: true };
    const key1 = new Uint8Array(await globalThis.crypto.subtle.exportKey("raw", (await webKit.createSecretKey(secret, opts)).key));
    const key2 = new Uint8Array(
      await globalThis.crypto.subtle.exportKey("raw", (await webKit.createSecretKey(`${secret}!`, opts)).key),
    );
    expect(key1).not.toEqual(key2);
  });

  test("Fail: Empty Secret Key", async () => {
    const nodeKey = nodeKit.tryCreateSecretKey("");
    expect(nodeKey.success).toBeFalsy();
    expect(nodeKey.error).toBeDefined();
    expect(nodeKey.result).toBeUndefined();

    const webKey = await webKit.tryCreateSecretKey("");
    expect(webKey.success).toBeFalsy();
    expect(webKey.error).toBeDefined();
    expect(webKey.result).toBeUndefined();
  });

  test("Fail: Short Secret Key", async () => {
    const nodeKey = nodeKit.tryCreateSecretKey("short");
    expect(nodeKey.success).toBeFalsy();
    expect(nodeKey.error).toBeDefined();
    expect(nodeKey.result).toBeUndefined();

    const webKey = await webKit.tryCreateSecretKey("short");
    expect(webKey.success).toBeFalsy();
    expect(webKey.error).toBeDefined();
    expect(webKey.result).toBeUndefined();
  });

  test("Fail: Invalid Options", async () => {
    // @ts-ignore
    const nodeKey = nodeKit.tryCreateSecretKey(secret, 3.14);
    expect(nodeKey.success).toBeFalsy();
    expect(nodeKey.error).toBeDefined();
    expect(nodeKey.result).toBeUndefined();

    // @ts-ignore
    const webKey = await webKit.tryCreateSecretKey(secret, 3.14);
    expect(webKey.success).toBeFalsy();
    expect(webKey.error).toBeDefined();
    expect(webKey.result).toBeUndefined();
  });

  test("Fail: Short Salt", async () => {
    const nodeKey = nodeKit.tryCreateSecretKey(secret, { salt: "short" });
    expect(nodeKey.success).toBeFalsy();
    expect(nodeKey.error).toBeDefined();
    expect(nodeKey.result).toBeUndefined();

    const webKey = await webKit.tryCreateSecretKey(secret, { salt: "short" });
    expect(webKey.success).toBeFalsy();
    expect(webKey.error).toBeDefined();
    expect(webKey.result).toBeUndefined();
  });

  test("Fail: Invalid Algorithm", async () => {
    // @ts-ignore
    const nodeKey = nodeKit.tryCreateSecretKey(secret, { algorithm: "invalid-algo" });
    expect(nodeKey.success).toBeFalsy();
    expect(nodeKey.error).toBeDefined();
    expect(nodeKey.result).toBeUndefined();

    // @ts-ignore
    const webKey = await webKit.tryCreateSecretKey(secret, { algorithm: "invalid-algo" });
    expect(webKey.success).toBeFalsy();
    expect(webKey.error).toBeDefined();
    expect(webKey.result).toBeUndefined();
  });

  test("Fail: Invalid Digest", async () => {
    // @ts-ignore
    const nodeKey = nodeKit.tryCreateSecretKey(secret, { digest: "invalid-algo" });
    expect(nodeKey.success).toBeFalsy();
    expect(nodeKey.error).toBeDefined();
    expect(nodeKey.result).toBeUndefined();

    // @ts-ignore
    const webKey = await webKit.tryCreateSecretKey(secret, { digest: "invalid-algo" });
    expect(webKey.success).toBeFalsy();
    expect(webKey.error).toBeDefined();
    expect(webKey.result).toBeUndefined();
  });
});
