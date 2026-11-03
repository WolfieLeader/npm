import nodeCrypto from "node:crypto";
import { describe, expect, test } from "vitest";
import { nodeKit, webKit } from "~/export.js";
import type { CipherEncoding, Encoding } from "~/helpers/types.js";
import { failure, secret } from "./__helpers__.js";

const CIPHER_ENCODINGS = ["base64", "base64url", "hex"] as const satisfies readonly CipherEncoding[];
const sym = Symbol("x");
const bad = <T>(x: unknown) => x as T;

describe("large payloads (>4 MB) decrypt on Node and Web", () => {
  // ~5 MB of plaintext encodes to ~7M base64 chars, past V8's old regex stack limit (~4.47M chars).
  const payload = "x".repeat(5 * 1024 * 1024);

  for (const enc of CIPHER_ENCODINGS) {
    test(`${enc}: node -> node, web -> web, and cross-platform`, async () => {
      const nk = nodeKit.createSecretKey(secret);
      const wk = await webKit.createSecretKey(secret);

      const fromNode = nodeKit.encrypt(payload, nk, { outputEncoding: enc });
      const fromWeb = await webKit.encrypt(payload, wk, { outputEncoding: enc });

      expect(nodeKit.tryDecrypt(fromNode, nk, { inputEncoding: enc }).result === payload).toBe(true);
      expect((await webKit.tryDecrypt(fromWeb, wk, { inputEncoding: enc })).result === payload).toBe(true);
      expect(nodeKit.tryDecrypt(fromWeb, nk, { inputEncoding: enc }).result === payload).toBe(true);
      expect((await webKit.tryDecrypt(fromNode, wk, { inputEncoding: enc })).result === payload).toBe(true);
    }, 60_000);
  }

  test("try* functions return errors for huge invalid input instead of throwing", async () => {
    const nk = nodeKit.createSecretKey(secret);
    const wk = await webKit.createSecretKey(secret);
    const hugeSeg = "A".repeat(8_000_000);
    const garbage = `AAAAAAAAAAAAAAAA.${hugeSeg}.AAAAAAAAAAAAAAAAAAAAAA==.`;
    // Base64 decoding skips the stray "=" padding, so GCM rejects the bytes; hex decoding rejects the letters.
    const authFailure = failure(
      "node decrypt: Failed to decrypt data",
      "Unsupported state or unable to authenticate data",
    );
    const expected: Record<(typeof CIPHER_ENCODINGS)[number], ReturnType<typeof failure>> = {
      base64: authFailure,
      base64url: authFailure,
      hex: failure(
        "node decrypt: Failed to decode input",
        "Conversion error: node strToBytes: Failed to convert data - Invalid hex string",
      ),
    };
    for (const enc of CIPHER_ENCODINGS) {
      expect(nodeKit.tryDecrypt(garbage, nk, { inputEncoding: enc }), enc).toStrictEqual(expected[enc]);
    }
    const webResults = await Promise.all(
      CIPHER_ENCODINGS.map((enc) => webKit.tryDecrypt(garbage, wk, { inputEncoding: enc })),
    );
    for (const r of webResults) expect(r.success).toBe(false);
    expect(nodeKit.tryConvertStrToBytes(`${hugeSeg}!`, "base64").success).toBe(false);
    expect(webKit.tryConvertStrToBytes(`${hugeSeg}!`, "base64").success).toBe(false);
  }, 60_000);
});

describe("decryptObj never leaks plaintext in errors", () => {
  const plaintexts = ["SSN=123-45-6789 card=4111111111111111", '{"password":"hunter2-super-secret", oops}'];

  test("node", () => {
    const nk = nodeKit.createSecretKey(secret);
    for (const pt of plaintexts) {
      const enc = nodeKit.encrypt(pt, nk);
      const r = nodeKit.tryDecryptObj(enc, nk);
      expect(r.success).toBe(false);
      const text = JSON.stringify(r.error);
      expect(text).not.toContain("123-45");
      expect(text).not.toContain("hunter2");
      expect(() => nodeKit.decryptObj(enc, nk)).toThrow(/^(?!.*(hunter2|123-45)).*$/s);
    }
  });

  test("web", async () => {
    const wk = await webKit.createSecretKey(secret);
    const results = await Promise.all(
      plaintexts.map(async (pt) => webKit.tryDecryptObj(await webKit.encrypt(pt, wk), wk)),
    );
    for (const r of results) {
      expect(r.success).toBe(false);
      const text = JSON.stringify(r.error);
      expect(text).not.toContain("123-45");
      expect(text).not.toContain("hunter2");
    }
  });
});

describe("option names must be own properties", () => {
  const inherited = ["constructor", "toString", "__proto__", "valueOf", "hasOwnProperty"];

  test("node rejects inherited digest/algorithm names with a clear error", () => {
    for (const name of inherited) {
      const h = nodeKit.tryHash("abc", { digest: bad(name) });
      expect(h.error?.message, name).toContain("Unsupported digest");

      const hp = nodeKit.tryHashPassword("password1", { digest: bad(name) });
      expect(hp.error?.message, name).toContain("Unsupported digest");

      const vp = nodeKit.tryVerifyPassword("password1", "a".repeat(86), "a".repeat(22), { digest: bad(name) });
      expect(vp.error?.message, name).toContain("Unsupported digest");

      const ka = nodeKit.tryCreateSecretKey(secret, { algorithm: bad(name) });
      expect(ka.error?.message, name).toContain("Unsupported algorithm");

      const kd = nodeKit.tryCreateSecretKey(secret, { digest: bad(name) });
      expect(kd.error?.message, name).toContain("Unsupported digest");
    }
  });

  test("web rejects inherited digest/algorithm names with a clear error", async () => {
    const checks = inherited.map(async (name) => {
      const digest = bad<"sha256">(name);
      const results = await Promise.all([
        webKit.tryHash("abc", { digest }),
        webKit.tryHashPassword("password1", { digest }),
        webKit.tryVerifyPassword("password1", "a".repeat(86), "a".repeat(22), { digest }),
      ]);
      for (const r of results) expect(r.error?.message, name).toContain("Unsupported digest");
      const key = await webKit.tryCreateSecretKey(secret, { algorithm: bad(name) });
      expect(key.error?.message, name).toContain("Unsupported algorithm");
    });
    await Promise.all(checks);
  });

  test("forged secret keys with inherited names are rejected", () => {
    const real = nodeKit.createSecretKey(secret);
    const forged = { ...real, digest: "constructor" };
    expect(nodeKit.isNodeSecretKey(forged)).toBe(false);
  });
});

describe("symbol option values never make try* throw", () => {
  test("node", () => {
    const nk = nodeKit.createSecretKey(secret);
    const enc = nodeKit.encrypt("hello", nk);
    const digests = "Supported digests are: sha256, sha384, sha512";
    const cipherEncodings = "Use base64, base64url, or hex";
    const encodings = "Use base64, base64url, hex, utf8, or latin1";
    const calls: Array<[() => unknown, ReturnType<typeof failure>]> = [
      [() => nodeKit.tryHash("abc", { digest: bad(sym) }), failure("node hash: Unsupported digest", digests)],
      [
        () => nodeKit.tryHash("abc", { outputEncoding: bad(sym) }),
        failure("node hash: Unsupported output encoding", cipherEncodings),
      ],
      [
        () => nodeKit.tryEncrypt("abc", nk, { outputEncoding: bad(sym) }),
        failure("node encrypt: Unsupported output encoding", cipherEncodings),
      ],
      [
        () => nodeKit.tryDecrypt(enc, nk, { inputEncoding: bad(sym) }),
        failure("node decrypt: Unsupported input encoding", cipherEncodings),
      ],
      [
        () => nodeKit.tryHashPassword("password1", { digest: bad(sym) }),
        failure("node hashPassword: Unsupported digest", digests),
      ],
      [
        () => nodeKit.tryHashPassword("password1", { outputEncoding: bad(sym) }),
        failure("node hashPassword: Unsupported output encoding", cipherEncodings),
      ],
      [
        () => nodeKit.tryVerifyPassword("password1", "aaaa", "aaaa", { inputEncoding: bad(sym) }),
        failure("node verifyPassword: Unsupported input encoding", cipherEncodings),
      ],
      [
        () => nodeKit.tryCreateSecretKey(secret, { algorithm: bad(sym) }),
        failure(
          "node createSecretKey: Unsupported algorithm",
          "Supported algorithms are: aes256gcm, aes192gcm, aes128gcm",
        ),
      ],
      [
        () => nodeKit.tryCreateSecretKey(secret, { digest: bad(sym) }),
        failure("node createSecretKey: Unsupported digest", digests),
      ],
      [
        () => nodeKit.tryConvertStrToBytes("abc", bad(sym)),
        failure("node strToBytes: Unsupported encoding", encodings),
      ],
      [
        () => nodeKit.tryConvertBytesToStr(Buffer.from("abc"), bad(sym)),
        failure("node bytesToStr: Unsupported encoding", encodings),
      ],
      [
        () => nodeKit.tryConvertEncoding("abc", bad(sym), "hex"),
        failure("node convertEncoding: Unsupported encoding", encodings),
      ],
    ];
    for (const [call, expected] of calls) {
      expect(call()).toStrictEqual(expected);
    }
  });

  test("web", async () => {
    const wk = await webKit.createSecretKey(secret);
    const enc = await webKit.encrypt("hello", wk);
    const results = [
      await webKit.tryHash("abc", { digest: bad(sym) }),
      await webKit.tryEncrypt("abc", wk, { outputEncoding: bad(sym) }),
      await webKit.tryDecrypt(enc, wk, { inputEncoding: bad(sym) }),
      await webKit.tryHashPassword("password1", { digest: bad(sym) }),
      await webKit.tryCreateSecretKey(secret, { algorithm: bad(sym) }),
      webKit.tryConvertStrToBytes("abc", bad(sym)),
      webKit.tryConvertEncoding("abc", "utf8", bad(sym)),
    ];
    for (const r of results) expect(r.success).toBe(false);
  });

  test("unsupported option values are not echoed in errors", () => {
    const r = nodeKit.tryConvertStrToBytes("abc", bad("my-secret-value"));
    expect(JSON.stringify(r.error)).not.toContain("my-secret-value");
    const h = nodeKit.tryHash("abc", { digest: bad("my-secret-value") });
    expect(JSON.stringify(h.error)).not.toContain("my-secret-value");
  });
});

describe("Node and Web decode identically", () => {
  const cases: Array<[string, Encoding, Encoding]> = [
    ["ff", "hex", "utf8"],
    ["61ff62", "hex", "utf8"],
    ["efbbbf61", "hex", "utf8"],
    ["ā", "latin1", "hex"],
    ["é", "latin1", "hex"],
    ["abc==", "base64url", "hex"],
    ["abcd=", "base64url", "hex"],
    ["YWI=", "base64url", "hex"],
    ["YWI", "base64url", "hex"],
    ["YQ==", "base64url", "hex"],
    ["AB==", "base64", "hex"],
    ["AA==", "base64", "hex"],
    ["YWI", "base64", "hex"],
    ["YW I=", "base64", "hex"],
    ["0xABCD", "hex", "base64"],
    ["abc", "hex", "base64"],
    ["a\uD800b", "utf8", "hex"],
    ["   ", "utf8", "hex"],
  ];

  for (const [input, from, to] of cases) {
    test(`${JSON.stringify(input)} ${from} -> ${to}`, () => {
      const n = nodeKit.tryConvertEncoding(input, from, to);
      const w = webKit.tryConvertEncoding(input, from, to);
      expect(n.success).toBe(w.success);
      expect(n.result).toBe(w.result);
    });
  }

  test("bytes -> utf8 rejects invalid UTF-8 on both", () => {
    expect(nodeKit.tryConvertBytesToStr(Buffer.from([0xff]), "utf8").success).toBe(false);
    expect(webKit.tryConvertBytesToStr(new Uint8Array([0xff]), "utf8").success).toBe(false);
  });

  test("decrypting invalid UTF-8 plaintext fails on both", async () => {
    const wk = await webKit.createSecretKey(secret, { extractable: true });
    const nk = nodeKit.createSecretKey(secret);
    const raw = Buffer.from(await globalThis.crypto.subtle.exportKey("raw", wk.key));
    const iv = nodeCrypto.randomBytes(12);
    const c = nodeCrypto.createCipheriv("aes-256-gcm", raw, iv);
    const ct = Buffer.concat([c.update(Buffer.from([0x61, 0xff, 0x62])), c.final()]);
    const s = `${iv.toString("base64url")}.${ct.toString("base64url")}.${c.getAuthTag().toString("base64url")}.`;
    expect(nodeKit.tryDecrypt(s, nk).success).toBe(false);
    expect((await webKit.tryDecrypt(s, wk)).success).toBe(false);
  });

  test("a leading BOM survives encrypt/decrypt on both", async () => {
    const nk = nodeKit.createSecretKey(secret);
    const wk = await webKit.createSecretKey(secret);
    const pt = "\uFEFFhello";
    expect(nodeKit.decrypt(nodeKit.encrypt(pt, nk), nk)).toBe(pt);
    expect(await webKit.decrypt(await webKit.encrypt(pt, wk), wk)).toBe(pt);
    expect(await webKit.decrypt(nodeKit.encrypt(pt, nk), wk)).toBe(pt);
  });
});

describe("encryptObj and decryptObj enforce the same size limit", () => {
  const over = { items: Array.from({ length: 100_000 }, (_, i) => ({ i })) }; // 100,002 containers

  test("node rejects on encrypt with an accurate message", () => {
    const nk = nodeKit.createSecretKey(secret);
    const r = nodeKit.tryEncryptObj(over, nk);
    expect(r.success).toBe(false);
    expect(r.error?.message).toContain("too many nested objects or arrays");
  });

  test("web rejects on encrypt with an accurate message", async () => {
    const wk = await webKit.createSecretKey(secret);
    const r = await webKit.tryEncryptObj(over, wk);
    expect(r.success).toBe(false);
    expect(r.error?.message).toContain("too many nested objects or arrays");
  });

  test("decrypt side reports the same message", () => {
    const nk = nodeKit.createSecretKey(secret);
    const enc = nodeKit.encrypt(JSON.stringify(over), nk);
    const r = nodeKit.tryDecryptObj(enc, nk);
    expect(r.success).toBe(false);
    expect(r.error?.message).toContain("too many nested objects or arrays");
  });
});

describe("string input rules", () => {
  test("encrypt accepts whitespace-only strings and rejects empty ones", async () => {
    const nk = nodeKit.createSecretKey(secret);
    const wk = await webKit.createSecretKey(secret);
    const inputs = ["   ", " x ", "\n"];
    for (const pt of inputs) expect(nodeKit.decrypt(nodeKit.encrypt(pt, nk), nk)).toBe(pt);
    const webRoundTrips = await Promise.all(inputs.map(async (pt) => webKit.decrypt(await webKit.encrypt(pt, wk), wk)));
    expect(webRoundTrips).toStrictEqual(inputs);
    expect(nodeKit.tryEncrypt("", nk).success).toBe(false);
    expect((await webKit.tryEncrypt("", wk)).success).toBe(false);
  });

  test("hash accepts the empty string and whitespace", async () => {
    const emptySha256 = "47DEQpj8HBSa-_TImW-5JCeuQeRkm5NMpJWZG3hSuFU";
    expect(nodeKit.hash("")).toBe(emptySha256);
    expect(await webKit.hash("")).toBe(emptySha256);
    expect(nodeKit.hash("   ")).toBe(await webKit.hash("   "));
  });

  test("lone surrogates are rejected instead of becoming U+FFFD", async () => {
    const nk = nodeKit.createSecretKey(secret);
    const wk = await webKit.createSecretKey(secret);
    const lone = "a\uD83Db";
    expect(nodeKit.tryEncrypt(lone, nk).success).toBe(false);
    expect((await webKit.tryEncrypt(lone, wk)).success).toBe(false);
    expect(nodeKit.tryHash(lone).success).toBe(false);
    expect((await webKit.tryHash(lone)).success).toBe(false);
    expect(nodeKit.tryHashPassword(`password${lone}`).success).toBe(false);
    expect((await webKit.tryHashPassword(`password${lone}`)).success).toBe(false);
    expect(nodeKit.tryCreateSecretKey(`${secret}${lone}`).success).toBe(false);
    expect((await webKit.tryCreateSecretKey(`${secret}${lone}`)).success).toBe(false);
    expect(nodeKit.tryCreateSecretKey(secret, { info: lone }).success).toBe(false);
  });
});

describe("HKDF info length", () => {
  test("info over 1024 UTF-8 bytes fails upfront on both platforms", async () => {
    const info = "i".repeat(1025);
    const n = nodeKit.tryCreateSecretKey(secret, { info });
    const w = await webKit.tryCreateSecretKey(secret, { info });
    expect(n.error?.message).toContain("Info must be at most 1024 bytes");
    expect(w.error?.message).toContain("Info must be at most 1024 bytes");
  });

  test("multi-byte info is measured in bytes", async () => {
    expect(nodeKit.tryCreateSecretKey(secret, { info: "é".repeat(513) }).success).toBe(false);
    expect((await webKit.tryCreateSecretKey(secret, { info: "é".repeat(513) })).success).toBe(false);
  });

  test("info of exactly 1024 bytes works and interoperates", async () => {
    const info = "é".repeat(512);
    const nk = nodeKit.createSecretKey(secret, { info });
    const wk = await webKit.createSecretKey(secret, { info });
    expect(await webKit.decrypt(nodeKit.encrypt("hi", nk), wk)).toBe("hi");
  });
});
