import { describe, expect, test } from "vitest";
import { nodeKit, webKit } from "~/export";
import { data, repeated } from "./__helpers__";

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
