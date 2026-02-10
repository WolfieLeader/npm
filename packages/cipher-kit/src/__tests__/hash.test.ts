import { describe, expect, test } from "vitest";
import { nodeKit, webKit } from "~/export.js";
import { data, repeated } from "./__helpers__.js";

describe("Hashing", () => {
  test("Hash Test", async () => {
    expect(nodeKit.hash(data, { digest: "sha256" })).toBe(await webKit.hash(data, { digest: "sha256" }));
    expect(nodeKit.hash(data, { digest: "sha384" })).toBe(await webKit.hash(data, { digest: "sha384" }));
    expect(nodeKit.hash(data, { digest: "sha512" })).toBe(await webKit.hash(data, { digest: "sha512" }));

    expect(nodeKit.hash(repeated, { digest: "sha256" })).toBe(await webKit.hash(repeated, { digest: "sha256" }));
    expect(nodeKit.hash(repeated, { digest: "sha384" })).toBe(await webKit.hash(repeated, { digest: "sha384" }));
    expect(nodeKit.hash(repeated, { digest: "sha512" })).toBe(await webKit.hash(repeated, { digest: "sha512" }));
  });

  test("Password Hash Test", async () => {
    const password = "SuperSecretPassword!";

    const nodeHash = nodeKit.tryHashPassword(password);
    expect(nodeHash.success).toBe(true);
    expect(nodeHash.result).toBeDefined();
    expect(nodeHash.salt).toBeDefined();

    const webHash = await webKit.tryHashPassword(password);
    expect(webHash.success).toBe(true);
    expect(webHash.result).toBeDefined();
    expect(webHash.salt).toBeDefined();

    expect(nodeHash.result).not.toBe(webHash.result);
    expect(nodeHash.salt).not.toBe(webHash.salt);

    const nodeVerify = nodeKit.verifyPassword(password, nodeHash.result as string, nodeHash.salt as string);
    expect(nodeVerify).toBe(true);

    const webVerify = await webKit.verifyPassword(password, webHash.result as string, webHash.salt as string);
    expect(webVerify).toBe(true);

    const nodeVerifyWrong = nodeKit.verifyPassword(
      "SuperSecredPassword",
      nodeHash.result as string,
      nodeHash.salt as string,
    );
    expect(nodeVerifyWrong).toBe(false);

    const webVerifyWrong = await webKit.verifyPassword(
      "SuperSecredPassword",
      webHash.result as string,
      webHash.salt as string,
    );
    expect(webVerifyWrong).toBe(false);
  });
});
