import { describe, expect, test } from "vitest";
import { nodeKit, webKit } from "~/export";
import { data } from "./__helpers__";

describe("Hashing", () => {
  test("Hash Test", async () => {
    expect(nodeKit.hash(data, { digest: "sha256" })).toBe(await webKit.hash(data, { digest: "sha256" }));
    expect(nodeKit.hash(data, { digest: "sha384" })).toBe(await webKit.hash(data, { digest: "sha384" }));
    expect(nodeKit.hash(data, { digest: "sha512" })).toBe(await webKit.hash(data, { digest: "sha512" }));
  });

  test("Password Hash Test", async () => {
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
