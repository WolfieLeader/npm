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
    expect(Array.from(nodeResult.result as Buffer)).toStrictEqual([0xab, 0xcd]);
    expect(Array.from(nodeResult.result as Buffer)).toStrictEqual(Array.from(webResult.result as Uint8Array));
  });

  test("0x00ff10 produces correct bytes (was empty before fix)", () => {
    const nodeResult = nodeKit.tryConvertStrToBytes("0x00ff10", "hex");
    expect(nodeResult.success).toBe(true);
    expect(Array.from(nodeResult.result as Buffer)).toStrictEqual([0x00, 0xff, 0x10]);
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

/** Decodes `input` with both kits. Each side is its bytes on success, or `null` on error. */
function decodeOnBoth(
  input: string,
  encoding: "base64" | "base64url",
): { node: number[] | null; web: number[] | null } {
  const n = nodeKit.tryConvertStrToBytes(input, encoding);
  const w = webKit.tryConvertStrToBytes(input, encoding);
  return { node: n.success ? Array.from(n.result) : null, web: w.success ? Array.from(w.result) : null };
}

const HELLO = [0x48, 0x65, 0x6c, 0x6c, 0x6f];
const bothError = { node: null, web: null };

describe("Base64/Base64url Node-Web parity", () => {
  describe("valid base64 inputs (both succeed with equal bytes)", () => {
    test("standard padded base64", () => {
      expect(decodeOnBoth("SGVsbG8=", "base64")).toStrictEqual({ node: HELLO, web: HELLO });
    });
    test("1-byte payload", () => {
      expect(decodeOnBoth("AA==", "base64")).toStrictEqual({ node: [0], web: [0] });
    });
    test("no-padding multiple of 4", () => {
      expect(decodeOnBoth("AQID", "base64")).toStrictEqual({ node: [1, 2, 3], web: [1, 2, 3] });
    });
  });

  describe("valid base64url inputs (both succeed with equal bytes)", () => {
    test("unpadded base64url", () => {
      expect(decodeOnBoth("SGVsbG8", "base64url")).toStrictEqual({ node: HELLO, web: HELLO });
    });
    test("padded base64url", () => {
      expect(decodeOnBoth("SGVsbG8=", "base64url")).toStrictEqual({ node: HELLO, web: HELLO });
    });
  });

  describe("malformed base64 inputs (both error)", () => {
    test("invalid length (1 char)", () => {
      expect(decodeOnBoth("A", "base64")).toStrictEqual(bothError);
    });
    test("bad padding (A=)", () => {
      expect(decodeOnBoth("A=", "base64")).toStrictEqual(bothError);
    });
    test("excess padding (AAAA=)", () => {
      expect(decodeOnBoth("AAAA=", "base64")).toStrictEqual(bothError);
    });
    test("non-ASCII character", () => {
      expect(decodeOnBoth("SGVs\u00e9bG8=", "base64")).toStrictEqual(bothError);
    });
  });

  describe("malformed base64url inputs (both error)", () => {
    test("invalid length (1 char)", () => {
      expect(decodeOnBoth("A", "base64url")).toStrictEqual(bothError);
    });
  });

  describe("Node rejects what Web rejects for base64url", () => {
    test("non-ASCII in base64url", () => {
      expect(decodeOnBoth("SGVs\u00e9bG8", "base64url")).toStrictEqual(bothError);
    });
  });
});
