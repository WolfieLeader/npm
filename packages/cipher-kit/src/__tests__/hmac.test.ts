import { Buffer } from "node:buffer";
import nodeCrypto from "node:crypto";
import * as fc from "fast-check";
import { describe, expect, test } from "vitest";
import { nodeKit, webKit } from "~/export.js";
import { $timingSafeEqual } from "~/helpers/compare.js";
import type { CipherEncoding, DigestAlgorithm } from "~/helpers/types.js";
import { anyText, failure } from "./__helpers__.js";

const hex = (value: string): Uint8Array => Buffer.from(value, "hex");

const DIGEST_BYTES = { sha256: 32, sha384: 48, sha512: 64 } as const satisfies Record<DigestAlgorithm, number>;
const DIGESTS = ["sha256", "sha384", "sha512"] as const satisfies readonly DigestAlgorithm[];
const ENCODINGS = ["base64", "base64url", "hex"] as const satisfies readonly CipherEncoding[];

// RFC 4231 section 4: HMAC-SHA-256/384/512 test cases 1 to 7. Case 5 truncates every MAC to 128 bits.
const RFC_4231 = [
  {
    name: "case 1",
    key: hex("0b".repeat(20)),
    data: hex("4869205468657265"),
    sha256: "b0344c61d8db38535ca8afceaf0bf12b881dc200c9833da726e9376c2e32cff7",
    sha384: "afd03944d84895626b0825f4ab46907f15f9dadbe4101ec682aa034c7cebc59cfaea9ea9076ede7f4af152e8b2fa9cb6",
    sha512:
      "87aa7cdea5ef619d4ff0b4241a1d6cb02379f4e2ce4ec2787ad0b30545e17cdedaa833b7d6b8a702038b274eaea3f4e4be9d914eeb61f1702e696c203a126854",
  },
  {
    name: "case 2 (key shorter than the MAC)",
    key: hex("4a656665"),
    data: hex("7768617420646f2079612077616e7420666f72206e6f7468696e673f"),
    sha256: "5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843",
    sha384: "af45d2e376484031617f78d2b58a6b1b9c7ef464f5a01b47e42ec3736322445e8e2240ca5e69e2c78b3239ecfab21649",
    sha512:
      "164b7a7bfcf819e2e395fbe73b56e0a387bd64222e831fd610270cd7ea2505549758bf75c05a994a6d034f65f8f0e6fdcaeab1a34d4a6b4b636e070a38bce737",
  },
  {
    name: "case 3 (key and data longer than 64 bytes)",
    key: hex("aa".repeat(20)),
    data: hex("dd".repeat(50)),
    sha256: "773ea91e36800e46854db8ebd09181a72959098b3ef8c122d9635514ced565fe",
    sha384: "88062608d3e6ad8a0aa2ace014c8a86f0aa635d947ac9febe83ef4e55966144b2a5ab39dc13814b94e3ab6e101a34f27",
    sha512:
      "fa73b0089d56a284efb0f0756c890be9b1b5dbdd8ee81a3655f83e33b2279d39bf3e848279a722c806b485a47e67c807b946a337bee8942674278859e13292fb",
  },
  {
    name: "case 4",
    key: hex("0102030405060708090a0b0c0d0e0f10111213141516171819"),
    data: hex("cd".repeat(50)),
    sha256: "82558a389a443c0ea4cc819899f2083a85f0faa3e578f8077a2e3ff46729665b",
    sha384: "3e8a69b7783c25851933ab6290af6ca77a9981480850009cc5577c6e1f573b4e6801dd23c4a7d679ccf8a386c674cffb",
    sha512:
      "b0ba465637458c6990e5a8c5f61d4af7e576d97ff94b872de76f8050361ee3dba91ca5c11aa25eb4d679275cc5788063a5f19741120c4f2de2adebeb10a298dd",
  },
  {
    name: "case 5 (MAC truncated to 128 bits)",
    key: hex("0c".repeat(20)),
    data: hex("546573742057697468205472756e636174696f6e"),
    length: 16,
    sha256: "a3b6167473100ee06e0c796c2955552b",
    sha384: "3abf34c3503b2a23a46efc619baef897",
    sha512: "415fad6271580a531d4179bc891d87a6",
  },
  {
    name: "case 6 (key longer than 128 bytes)",
    key: hex("aa".repeat(131)),
    data: hex(
      "54657374205573696e67204c6172676572205468616e20426c6f636b2d53697a65204b6579202d2048617368204b6579204669727374",
    ),
    sha256: "60e431591ee0b67f0d8a26aacbf5b77f8e0bc6213728c5140546040f0ee37f54",
    sha384: "4ece084485813e9088d2c63a041bc5b44f9ef1012a2b588f3cd11f05033ac4c60c2ef6ab4030fe8296248df163f44952",
    sha512:
      "80b24263c7c1a3ebb71493c1dd7be8b49b46d1f41b4aeec1121b013783f8f3526b56d037e05f2598bd0fd2215d6a1e5295e64f73f63f0aec8b915a985d786598",
  },
  {
    name: "case 7 (key and data longer than 128 bytes)",
    key: hex("aa".repeat(131)),
    data: hex(
      "5468697320697320612074657374207573696e672061206c6172676572207468616e20626c6f636b2d73697a65206b657920616e642061206c6172676572207468616e20626c6f636b2d73697a6520646174612e20546865206b6579206e6565647320746f20626520686173686564206265666f7265206265696e6720757365642062792074686520484d414320616c676f726974686d2e",
    ),
    sha256: "9b09ffa71b942fcb27635fbcd5b0e944bfdc63644f0713938a7f51535c3a35e2",
    sha384: "6617178e941f020d351e2f254e8fd32c602420feb0b8fb9adccebb82461e99c5a678cc31e799176d3860e6110c46523e",
    sha512:
      "e37b6a775dc87dbaa4dfa9f96e5e3ffddebd71f8867289865df5a32d20cdc944b6022cac3c4982b10d5eeb55c3e4de15134676fb6de0446065c97440fa8c6a58",
  },
];

describe("hmac matches the RFC 4231 test vectors", () => {
  for (const vector of RFC_4231) {
    for (const digest of DIGESTS) {
      const length = vector.length === undefined ? {} : { length: vector.length };
      const options = { digest, outputEncoding: "hex", ...length } as const;
      const verifyOptions = { digest, inputEncoding: "hex", ...length } as const;

      test(`${vector.name}, ${digest}: Node and Web`, async () => {
        expect(nodeKit.hmac(vector.data, vector.key, options)).toBe(vector[digest]);
        expect(await webKit.hmac(vector.data, vector.key, options)).toBe(vector[digest]);
        expect(nodeKit.verifyHmac(vector.data, vector[digest], vector.key, verifyOptions)).toBe(true);
        expect(await webKit.verifyHmac(vector.data, vector[digest], vector.key, verifyOptions)).toBe(true);
      });
    }
  }

  test("string data and key are hashed as their UTF-8 bytes, with no key derivation", async () => {
    const expected = "5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843";
    expect(nodeKit.hmac("what do ya want for nothing?", "Jefe", { outputEncoding: "hex" })).toBe(expected);
    expect(await webKit.hmac("what do ya want for nothing?", "Jefe", { outputEncoding: "hex" })).toBe(expected);
  });

  test("the default output is the full SHA-256 MAC in base64url", async () => {
    const expected = Buffer.from("5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843", "hex").toString(
      "base64url",
    );
    expect(nodeKit.hmac("what do ya want for nothing?", "Jefe")).toBe(expected);
    expect(await webKit.hmac("what do ya want for nothing?", "Jefe")).toBe(expected);
  });
});

describe("hmac and verifyHmac reject invalid input with fixed messages", () => {
  const keyMessage = "Key must be a non-empty string or Uint8Array";
  const keyDescription = "Received an empty value, another type, or a string with lone UTF-16 surrogates";
  const lengthMessage = "Length must be from 8 bytes to the digest length";

  test("an empty key, as a string or as bytes", async () => {
    for (const key of ["", new Uint8Array(0)]) {
      expect(nodeKit.tryHmac("data", key)).toStrictEqual(failure(`node hmac: ${keyMessage}`, keyDescription));
      expect(await webKit.tryHmac("data", key)).toStrictEqual(failure(`web hmac: ${keyMessage}`, keyDescription));
      expect(nodeKit.tryVerifyHmac("data", "mac", key)).toStrictEqual(
        failure(`node verifyHmac: ${keyMessage}`, keyDescription),
      );
      expect(await webKit.tryVerifyHmac("data", "mac", key)).toStrictEqual(
        failure(`web verifyHmac: ${keyMessage}`, keyDescription),
      );
    }
  });

  test("data or key with a lone surrogate", async () => {
    expect(nodeKit.tryHmac("\uD800", "key")).toStrictEqual(
      failure(
        "node hmac: Data must be a string or a Uint8Array",
        "Received another type, or a string with lone UTF-16 surrogates",
      ),
    );
    expect(await webKit.tryHmac("data", "\uDC00")).toStrictEqual(failure(`web hmac: ${keyMessage}`, keyDescription));
  });

  test("a length below 8 bytes or above the digest length", async () => {
    expect(nodeKit.tryHmac("data", "key", { length: 7 })).toStrictEqual(
      failure(`node hmac: ${lengthMessage}`, "Use an integer from 8 to 32 for sha256"),
    );
    expect(await webKit.tryHmac("data", "key", { length: 33 })).toStrictEqual(
      failure(`web hmac: ${lengthMessage}`, "Use an integer from 8 to 32 for sha256"),
    );
    expect(nodeKit.tryVerifyHmac("data", "mac", "key", { digest: "sha384", length: 65 })).toStrictEqual(
      failure(`node verifyHmac: ${lengthMessage}`, "Use an integer from 8 to 48 for sha384"),
    );
    expect(await webKit.tryVerifyHmac("data", "mac", "key", { length: 8.5 })).toStrictEqual(
      failure(`web verifyHmac: ${lengthMessage}`, "Use an integer from 8 to 32 for sha256"),
    );
  });

  test("a MAC that is not a string", async () => {
    const description = "Pass the encoded MAC returned by hmac()";
    expect(nodeKit.tryVerifyHmac("data", new Uint8Array(32) as unknown as string, "key")).toStrictEqual(
      failure("node verifyHmac: MAC must be a string", description),
    );
    expect(await webKit.tryVerifyHmac("data", 42 as unknown as string, "key")).toStrictEqual(
      failure("web verifyHmac: MAC must be a string", description),
    );
  });
});

describe("verifyHmac takes the expected length from the options, never from the presented MAC", () => {
  const key = "webhook-signing-key";
  const data = '{"event":"payment.succeeded"}';

  test("no 1-byte tag verifies, so a forger cannot win 1 time in 256", async () => {
    const tags = Array.from({ length: 256 }, (_, byte) => Buffer.from([byte]).toString("base64url"));
    const nodeResults = tags.map((tag) => nodeKit.verifyHmac(data, tag, key));
    const webResults = await Promise.all(tags.map(async (tag) => webKit.verifyHmac(data, tag, key)));
    expect(nodeResults).toStrictEqual(Array.from({ length: 256 }, () => false));
    expect(webResults).toStrictEqual(Array.from({ length: 256 }, () => false));
  });

  test("a correct MAC truncated below the expected length is false", async () => {
    const full = nodeKit.hmac(data, key, { outputEncoding: "hex" });
    const truncated = full.slice(0, 32);
    expect(nodeKit.verifyHmac(data, truncated, key, { inputEncoding: "hex" })).toBe(false);
    expect(await webKit.verifyHmac(data, truncated, key, { inputEncoding: "hex" })).toBe(false);
    expect(nodeKit.verifyHmac(data, truncated, key, { inputEncoding: "hex", length: 16 })).toBe(true);
    expect(await webKit.verifyHmac(data, truncated, key, { inputEncoding: "hex", length: 16 })).toBe(true);
  });

  test("a presented MAC that does not decode, or is too long to decode, is false", async () => {
    const full = nodeKit.hmac(data, key);
    for (const mac of ["", "!!!!", `${full}A`, `${full}${"A".repeat(10_000)}`]) {
      expect(nodeKit.tryVerifyHmac(data, mac, key), mac.slice(0, 50)).toStrictEqual({ success: true, result: false });
      expect(await webKit.tryVerifyHmac(data, mac, key), mac.slice(0, 50)).toStrictEqual({
        success: true,
        result: false,
      });
    }
  });

  test("a hex MAC with a 0x prefix is false, since the presented text is length-checked before decoding", async () => {
    const mac = nodeKit.hmac(data, key, { outputEncoding: "hex" });
    const options = { inputEncoding: "hex" } as const;
    expect(nodeKit.verifyHmac(data, mac, key, options)).toBe(true);
    expect(nodeKit.verifyHmac(data, `0x${mac}`, key, options)).toBe(false);
    expect(await webKit.verifyHmac(data, `0x${mac}`, key, options)).toBe(false);
  });

  test("a different key or tampered data is false", async () => {
    const mac = nodeKit.hmac(data, key);
    expect(nodeKit.verifyHmac(data, mac, `${key}!`)).toBe(false);
    expect(await webKit.verifyHmac(`${data} `, mac, key)).toBe(false);
  });
});

/** The MAC from node:crypto directly, with the key bytes used as given. */
function reference(data: string | Uint8Array, key: string | Uint8Array, digest: DigestAlgorithm): Buffer {
  return nodeCrypto.createHmac(digest, key).update(data).digest();
}

describe("hmac properties", () => {
  const anyBytes = fc.uint8Array({ maxLength: 300 });
  const anyData = fc.oneof(anyText, anyBytes);
  const anyKey = fc.oneof(
    anyText.filter((text) => text !== ""),
    fc.uint8Array({ minLength: 1, maxLength: 200 }),
    fc.constantFrom(" ", "\u0000", new Uint8Array(1), new Uint8Array(129).fill(0xaa)),
  );
  const anyOptions = fc.constantFrom(...DIGESTS).chain((digest) =>
    fc.record({
      digest: fc.constant(digest),
      encoding: fc.constantFrom(...ENCODINGS),
      length: fc.integer({ min: 8, max: DIGEST_BYTES[digest] }),
    }),
  );

  test("Node and Web match node:crypto for any data and key", async () => {
    await fc.assert(
      fc.asyncProperty(anyData, anyKey, anyOptions, async (data, key, { digest, encoding, length }) => {
        const expected = reference(data, key, digest).subarray(0, length).toString(encoding);
        const options = { digest, outputEncoding: encoding, length };
        expect(nodeKit.hmac(data, key, options)).toBe(expected);
        expect(await webKit.hmac(data, key, options)).toBe(expected);
      }),
      { numRuns: 300 },
    );
  });

  test("verifyHmac accepts what hmac returns, across Node and Web", async () => {
    await fc.assert(
      fc.asyncProperty(anyData, anyKey, anyOptions, async (data, key, { digest, encoding, length }) => {
        const verifyOptions = { digest, inputEncoding: encoding, length };
        const fromNode = nodeKit.hmac(data, key, { digest, outputEncoding: encoding, length });
        const fromWeb = await webKit.hmac(data, key, { digest, outputEncoding: encoding, length });
        expect(nodeKit.verifyHmac(data, fromWeb, key, verifyOptions)).toBe(true);
        expect(await webKit.verifyHmac(data, fromNode, key, verifyOptions)).toBe(true);
      }),
      { numRuns: 200 },
    );
  });

  test("a presented MAC shorter or longer than length is false, even when it starts with the real MAC", async () => {
    const otherLength = fc.integer({ min: 1, max: 80 });
    await fc.assert(
      fc.asyncProperty(
        anyData,
        anyKey,
        anyOptions,
        otherLength,
        async (data, key, { digest, encoding, length }, presentedLength) => {
          fc.pre(presentedLength !== length);
          const full = reference(data, key, digest);
          const presentedBytes = Buffer.alloc(presentedLength);
          full.copy(presentedBytes, 0, 0, Math.min(presentedLength, full.length));
          const presented = presentedBytes.toString(encoding);
          const verifyOptions = { digest, inputEncoding: encoding, length };
          expect(nodeKit.verifyHmac(data, presented, key, verifyOptions)).toBe(false);
          expect(await webKit.verifyHmac(data, presented, key, verifyOptions)).toBe(false);
        },
      ),
      { numRuns: 300 },
    );
  });
});

describe("$timingSafeEqual", () => {
  test("is true only for equal bytes of equal length", () => {
    expect($timingSafeEqual(new Uint8Array([1, 2, 3]), new Uint8Array([1, 2, 3]))).toBe(true);
    expect($timingSafeEqual(new Uint8Array(0), new Uint8Array(0))).toBe(true);
    expect($timingSafeEqual(new Uint8Array([1, 2, 3]), new Uint8Array([1, 2, 2]))).toBe(false);
    expect($timingSafeEqual(new Uint8Array([0x80, 2, 3]), new Uint8Array([0, 2, 3]))).toBe(false);
    expect($timingSafeEqual(new Uint8Array([1, 2]), new Uint8Array([1, 2, 3]))).toBe(false);
  });
});

/** Gives `crypto.subtle` a recording `timingSafeEqual` that answers `answer`, as Cloudflare Workers has, for `fn`. */
async function withNative<T>(answer: boolean, fn: () => T | Promise<T>): Promise<{ result: T; calls: number[][][] }> {
  const calls: number[][][] = [];
  const subtle = globalThis.crypto.subtle;
  expect("timingSafeEqual" in subtle).toBe(false);
  Object.defineProperty(subtle, "timingSafeEqual", {
    configurable: true,
    value: (a: Uint8Array, b: Uint8Array) => {
      calls.push([[...a], [...b]]);
      return answer;
    },
  });
  try {
    return { result: await fn(), calls };
  } finally {
    Reflect.deleteProperty(subtle, "timingSafeEqual");
  }
}

describe("native compare", () => {
  const key = "webhook-signing-key";
  const data = '{"event":"payment.succeeded"}';

  test("web verifyHmac uses the runtime's crypto.subtle.timingSafeEqual when it has one, with both MACs", async () => {
    const mac = nodeKit.hmac(data, key, { length: 16, outputEncoding: "hex" });
    const options = { length: 16, inputEncoding: "hex" } as const;
    const accepted = await withNative(true, () => webKit.verifyHmac(data, mac, key, options));
    expect(accepted.result).toBe(true);
    expect(accepted.calls).toStrictEqual([[[...hex(mac)], [...hex(mac)]]]);
    const refused = await withNative(false, () => webKit.verifyHmac(data, mac, key, options));
    expect(refused.result).toBe(false);
  });

  test("web verifyPassword uses the runtime's crypto.subtle.timingSafeEqual when it has one", async () => {
    const { result, salt } = await webKit.hashPassword("correct horse", { iterations: 100_000 });
    const refused = await withNative(false, () =>
      webKit.verifyPassword("correct horse", result, salt, { iterations: 100_000 }),
    );
    expect(refused.result).toBe(false);
    expect(refused.calls.length).toBe(1);
  });

  test("a different length never reaches the native compare, which throws on unequal lengths in Workers", async () => {
    const calls = await withNative(true, () => $timingSafeEqual(new Uint8Array([1, 2]), new Uint8Array([1])));
    expect(calls).toStrictEqual({ result: false, calls: [] });
  });
});

describe("caller's bytes", () => {
  test("hmac and verifyHmac leave the caller's key and data unchanged, since they wipe only their own copies", async () => {
    const key = Uint8Array.from({ length: 32 }, (_, i) => i + 1);
    const data = Uint8Array.from({ length: 16 }, (_, i) => 200 - i);
    const keyBefore = Uint8Array.from(key);
    const dataBefore = Uint8Array.from(data);

    const nodeMac = nodeKit.hmac(data, key);
    expect(nodeKit.verifyHmac(data, nodeMac, key)).toBe(true);
    const webMac = await webKit.hmac(data, key);
    expect(await webKit.verifyHmac(data, webMac, key)).toBe(true);

    expect(key).toStrictEqual(keyBefore);
    expect(data).toStrictEqual(dataBefore);
  });
});
