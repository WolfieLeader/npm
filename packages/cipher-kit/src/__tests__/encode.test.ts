import type { Buffer } from "node:buffer";
import { describe, expect, test } from "vitest";
import { nodeKit, webKit } from "~/export.js";
import { data, repeated } from "./__helpers__.js";

describe("Encoding", () => {
  test("Encoding Test", () => {
    expect(nodeKit.convertEncoding(data, "utf8", "base64")).toBe(webKit.convertEncoding(data, "utf8", "base64"));
    expect(nodeKit.convertEncoding(data, "utf8", "hex")).toBe(webKit.convertEncoding(data, "utf8", "hex"));
    expect(nodeKit.convertEncoding(data, "utf8", "base64url")).toBe(webKit.convertEncoding(data, "utf8", "base64url"));
    expect(nodeKit.convertEncoding(data, "utf8", "latin1")).toBe(webKit.convertEncoding(data, "utf8", "latin1"));

    expect(nodeKit.convertEncoding(repeated, "utf8", "base64")).toBe(
      webKit.convertEncoding(repeated, "utf8", "base64"),
    );

    expect(nodeKit.convertEncoding(repeated, "utf8", "hex")).toBe(webKit.convertEncoding(repeated, "utf8", "hex"));

    expect(nodeKit.convertEncoding(repeated, "utf8", "base64url")).toBe(
      webKit.convertEncoding(repeated, "utf8", "base64url"),
    );

    expect(nodeKit.convertEncoding(repeated, "utf8", "latin1")).toBe(
      webKit.convertEncoding(repeated, "utf8", "latin1"),
    );
  });
});

describe("Hex encoding with 0x prefix", () => {
  test("0xABCD produces correct bytes matching Web", () => {
    const nodeResult = nodeKit.tryConvertStrToBytes("0xABCD", "hex");
    const webResult = webKit.tryConvertStrToBytes("0xABCD", "hex");
    expect(nodeResult.success).toBe(true);
    expect(webResult.success).toBe(true);
    expect(Array.from(nodeResult.result as Buffer)).toEqual([0xab, 0xcd]);
    expect(Array.from(nodeResult.result as Buffer)).toEqual(Array.from(webResult.result as Uint8Array));
  });

  test("0x00ff10 produces correct bytes (was empty before fix)", () => {
    const nodeResult = nodeKit.tryConvertStrToBytes("0x00ff10", "hex");
    expect(nodeResult.success).toBe(true);
    expect(Array.from(nodeResult.result as Buffer)).toEqual([0x00, 0xff, 0x10]);
  });

  test("hex roundtrip: Node encode → decode matches Web", () => {
    const input = "Hello, World!";
    const nodeHex = nodeKit.convertEncoding(input, "utf8", "hex");
    const webHex = webKit.convertEncoding(input, "utf8", "hex");
    expect(nodeHex).toBe(webHex);

    const nodeBack = nodeKit.convertEncoding(nodeHex, "hex", "utf8");
    const webBack = webKit.convertEncoding(webHex, "hex", "utf8");
    expect(nodeBack).toBe(input);
    expect(webBack).toBe(input);
  });
});

describe("Encoding round-trip", () => {
  test("multi-hop: utf8 → base64url → hex → utf8", () => {
    const input = "Hello, cipher-kit! 🔐";
    const b64url = nodeKit.convertEncoding(input, "utf8", "base64url");
    const hex = nodeKit.convertEncoding(b64url, "base64url", "hex");
    const back = nodeKit.convertEncoding(hex, "hex", "utf8");
    expect(back).toBe(input);

    const wb64url = webKit.convertEncoding(input, "utf8", "base64url");
    const whex = webKit.convertEncoding(wb64url, "base64url", "hex");
    const wback = webKit.convertEncoding(whex, "hex", "utf8");
    expect(wback).toBe(input);
  });

  test("try variants return success for valid round-trip", () => {
    const input = "test data";
    const nodeResult = nodeKit.tryConvertEncoding(input, "utf8", "base64");
    expect(nodeResult.success).toBe(true);
    const webResult = webKit.tryConvertEncoding(input, "utf8", "base64");
    expect(webResult.success).toBe(true);
    expect(nodeResult.result).toBe(webResult.result);
  });
});

describe("generateUuid", () => {
  test("returns a valid UUID v4 format", () => {
    const uuid = nodeKit.generateUuid();
    expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  test("generates unique UUIDs", () => {
    const a = nodeKit.generateUuid();
    const b = nodeKit.generateUuid();
    expect(a).not.toBe(b);
  });

  test("tryGenerateUuid returns success", () => {
    const result = nodeKit.tryGenerateUuid();
    expect(result.success).toBe(true);
    expect(result.result).toMatch(/^[0-9a-f]{8}-/);
  });
});

describe("Base64/Base64url Node-Web parity", () => {
  function bothSucceed(input: string, encoding: "base64" | "base64url") {
    const n = nodeKit.tryConvertStrToBytes(input, encoding);
    const w = webKit.tryConvertStrToBytes(input, encoding);
    expect(n.success).toBe(true);
    expect(w.success).toBe(true);
    expect(Array.from(n.result as Buffer)).toEqual(Array.from(w.result as Uint8Array));
  }

  function bothError(input: string, encoding: "base64" | "base64url") {
    const n = nodeKit.tryConvertStrToBytes(input, encoding);
    const w = webKit.tryConvertStrToBytes(input, encoding);
    expect(n.success).toBe(false);
    expect(w.success).toBe(false);
  }

  describe("valid base64 inputs (both succeed with equal bytes)", () => {
    test("standard padded base64", () => bothSucceed("SGVsbG8=", "base64"));
    test("1-byte payload", () => bothSucceed("AA==", "base64"));
    test("no-padding multiple of 4", () => bothSucceed("AQID", "base64"));
  });

  describe("valid base64url inputs (both succeed with equal bytes)", () => {
    test("unpadded base64url", () => bothSucceed("SGVsbG8", "base64url"));
    test("padded base64url", () => bothSucceed("SGVsbG8=", "base64url"));
  });

  describe("malformed base64 inputs (both error)", () => {
    test("invalid length (1 char)", () => bothError("A", "base64"));
    test("bad padding (A=)", () => bothError("A=", "base64"));
    test("excess padding (AAAA=)", () => bothError("AAAA=", "base64"));
    test("non-ASCII character", () => bothError("SGVs\u00e9bG8=", "base64"));
  });

  describe("malformed base64url inputs (both error)", () => {
    test("invalid length (1 char)", () => bothError("A", "base64url"));
  });

  describe("Node rejects what Web rejects for base64url", () => {
    test("non-ASCII in base64url", () => bothError("SGVs\u00e9bG8", "base64url"));
  });
});
