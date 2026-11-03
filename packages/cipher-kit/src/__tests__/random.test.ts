import { afterEach, describe, expect, test, vi } from "vitest";
import { nodeKit, webKit } from "~/export.js";
import { $randomCode, $rejectionLimit, $uuidV7 } from "~/helpers/random.js";
import type { FillRandom } from "~/helpers/random.js";
import { encodedPattern, failure } from "./__helpers__.js";

const UUID_V4 = /^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/;
const UUID_V7 = /^[\da-f]{8}-[\da-f]{4}-7[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/;
const kits = [
  { label: "node", kit: nodeKit },
  { label: "web", kit: webKit },
] as const;

/** A random source that returns `words` as successive Uint32 draws, and records how many it gave. */
function scripted(words: number[]): { fill: FillRandom; draws: () => number } {
  let next = 0;
  return {
    fill: (bytes) => {
      new Uint32Array(bytes.buffer, bytes.byteOffset, 1)[0] = words[next] ?? 0;
      next++;
    },
    draws: () => next,
  };
}

/** The Unix milliseconds in a UUIDv7's first 48 bits. */
function timestampOf(uuid: string): number {
  return Number.parseInt(uuid.replaceAll("-", "").slice(0, 12), 16);
}

describe("randomCode", () => {
  test("the rejection limit is the largest multiple of 10^digits up to 2^32", () => {
    expect([4, 5, 6, 7, 8, 9].map((digits) => $rejectionLimit(10 ** digits))).toStrictEqual([
      4_294_960_000, 4_294_900_000, 4_294_000_000, 4_290_000_000, 4_200_000_000, 4_000_000_000,
    ]);
  });

  test("redraws a value at or above the limit instead of folding it with modulo", () => {
    const source = scripted([0xff_ff_ff_ff, 4_294_000_000, 123]);
    expect($randomCode(6, source.fill, "node")).toStrictEqual({ success: true, result: "000123" });
    expect(source.draws()).toBe(3);
  });

  test("accepts the value just below the limit", () => {
    const source = scripted([4_293_999_999]);
    expect($randomCode(6, source.fill, "node")).toStrictEqual({ success: true, result: "999999" });
    expect(source.draws()).toBe(1);
  });

  test("keeps leading zeros", () => {
    expect($randomCode(9, scripted([7]).fill, "web")).toStrictEqual({ success: true, result: "000000007" });
    expect($randomCode(4, scripted([0]).fill, "web")).toStrictEqual({ success: true, result: "0000" });
  });

  for (const { label, kit } of kits) {
    test(`${label}: returns exactly digits decimal digits for every allowed digits`, () => {
      for (let digits = 4; digits <= 9; digits++) {
        const codes = Array.from({ length: 200 }, () => kit.randomCode(digits));
        expect(
          codes.every((code) => new RegExp(`^\\d{${digits}}$`).test(code)),
          `${digits} digits`,
        ).toBe(true);
      }
      expect(kit.randomCode()).toMatch(/^\d{6}$/);
    });

    test(`${label}: rejects digits outside 4 to 9 or not an integer`, () => {
      for (const digits of [3, 10, 6.5, Number.NaN, "6" as unknown as number]) {
        expect(kit.tryRandomCode(digits), String(digits)).toStrictEqual(
          failure(
            `${label} randomCode: Digits must be an integer from 4 to 9`,
            "Use 6 digits for one-time codes, and pair them with expiry and attempt limits",
          ),
        );
      }
    });
  }
});

describe("randomToken", () => {
  for (const { label, kit } of kits) {
    test(`${label}: encodes the requested number of random bytes`, () => {
      expect(kit.randomToken()).toMatch(encodedPattern(32));
      expect(kit.randomToken(8, "hex")).toMatch(/^[\da-f]{16}$/);
      expect(kit.randomToken(1024, "base64")).toMatch(encodedPattern(1024, "base64"));
      expect(kit.randomToken()).not.toBe(kit.randomToken());
    });

    test(`${label}: rejects a byte count outside 8 to 1024 and a text encoding`, () => {
      const bytesError = failure(
        `${label} randomToken: Bytes must be an integer from 8 to 1024`,
        "Use 32 bytes (256 bits) or more for session and API tokens",
      );
      for (const bytes of [7, 1025, 16.5, "32" as unknown as number]) {
        expect(kit.tryRandomToken(bytes), String(bytes)).toStrictEqual(bytesError);
      }
      expect(kit.tryRandomToken(32, "utf8" as "hex")).toStrictEqual(
        failure(`${label} randomToken: Unsupported output encoding`, "Use base64, base64url, or hex"),
      );
    });
  }
});

describe("generateUuid", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  test("formats the RFC 9562 appendix A.6 UUIDv7 test vector", () => {
    const random = Uint8Array.from([0, 0, 0, 0, 0, 0, 0x0c, 0xc3, 0x18, 0xc4, 0xdc, 0x0c, 0x0c, 0x07, 0x39, 0x8f]);
    expect($uuidV7(0x01_7f_22_e2_79_b0, random)).toBe("017f22e2-79b0-7cc3-98c4-dc0c0c07398f");
  });

  test("the timestamp outranks the random bits, so a later millisecond sorts later", () => {
    const earlier = $uuidV7(1_700_000_000_000, new Uint8Array(16).fill(0xff));
    const later = $uuidV7(1_700_000_000_001, new Uint8Array(16));
    expect(earlier < later).toBe(true);
  });

  for (const { label, kit } of kits) {
    test(`${label}: defaults to version 4`, () => {
      expect(kit.generateUuid()).toMatch(UUID_V4);
      expect(kit.generateUuid({})).toMatch(UUID_V4);
      expect(kit.generateUuid({ version: 4 })).toMatch(UUID_V4);
    });

    test(`${label}: version 7 has the version and variant bits and the current time`, () => {
      for (let i = 0; i < 100; i++) {
        const before = Date.now();
        const uuid = kit.generateUuid({ version: 7 });
        const after = Date.now();
        expect(uuid).toMatch(UUID_V7);
        const timestamp = timestampOf(uuid);
        expect(timestamp >= before && timestamp <= after, `${String(timestamp)} in [${before}, ${after}]`).toBe(true);
      }
    });

    test(`${label}: version 7 UUIDs from different milliseconds sort in creation order`, () => {
      vi.useFakeTimers({ toFake: ["Date"] });
      const start = 1_700_000_000_000;
      const uuids = Array.from({ length: 300 }, (_, i) => {
        vi.setSystemTime(start + i);
        return kit.generateUuid({ version: 7 });
      });
      expect(uuids.map((uuid) => timestampOf(uuid))).toStrictEqual(uuids.map((_, i) => start + i));
      expect(uuids.toSorted()).toStrictEqual(uuids);
    });

    test(`${label}: version 7 fails when the clock is outside 48 bits`, () => {
      vi.useFakeTimers({ toFake: ["Date"] });
      for (const now of [-1, 2 ** 48]) {
        vi.setSystemTime(now);
        expect(kit.tryGenerateUuid({ version: 7 }), String(now)).toStrictEqual(
          failure(
            `${label} generateUuid: Clock is outside the UUIDv7 range`,
            "UUIDv7 needs a Unix time from 1970 to the year 10889 in milliseconds",
          ),
        );
      }
    });

    test(`${label}: rejects other versions and options that are not a plain object`, () => {
      for (const version of [5, 1, 6, "7"]) {
        expect(kit.tryGenerateUuid({ version: version as 7 }), String(version)).toStrictEqual(
          failure(`${label} generateUuid: Unsupported UUID version`, "Use 4 or 7"),
        );
      }
      expect(kit.tryGenerateUuid(null as unknown as object)).toStrictEqual(
        failure(`${label} generateUuid: Options must be a plain object`, "Pass an object like { version: 7 }"),
      );
    });
  }
});
