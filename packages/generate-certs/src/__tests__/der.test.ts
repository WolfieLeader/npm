import { describe, expect, it } from "vitest";
import { $bitString, $length, $oid, $time, $unsignedInteger, $utf8String, $ascii } from "~/der.js";

const hex = (bytes: Uint8Array): string => Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
const int = (...bytes: number[]): string => hex($unsignedInteger(Uint8Array.of(...bytes)));
const timeAt = (iso: string): string => timeText($time(new Date(iso)));
/** A time element as `tag:text`. Its text is ASCII, so each byte is one character. */
const timeText = (element: Uint8Array): string =>
  `${(element[0] ?? 0).toString(16)}:${String.fromCodePoint(...element.subarray(2))}`;

describe("DER encoder (X.690 known answers)", () => {
  it("encodes lengths in short form below 128 and minimal long form above", () => {
    expect(hex($length(0))).toBe("00");
    expect(hex($length(127))).toBe("7f");
    expect(hex($length(128))).toBe("8180");
    expect(hex($length(255))).toBe("81ff");
    expect(hex($length(256))).toBe("820100");
    expect(hex($length(65_536))).toBe("83010000");
  });

  it("encodes unsigned integers minimally, with a sign byte only before a set high bit", () => {
    expect(int(2)).toBe("020102");
    expect(int(0)).toBe("020100");
    expect(int()).toBe("020100");
    expect(int(0x80)).toBe("02020080");
    // A random serial can start with zero bytes; DER forbids them unless the next byte has its high bit set.
    expect(int(0, 0, 0x7f)).toBe("02017f");
    expect(int(0, 0x80)).toBe("02020080");
  });

  it("encodes OIDs with the first two arcs combined and base-128 arcs", () => {
    expect(hex($oid("2.5.4.3"))).toBe("0603550403");
    expect(hex($oid("1.2.840.113549.1.1.11"))).toBe("06092a864886f70d01010b");
    expect(hex($oid("1.3.6.1.5.5.7.3.1"))).toBe("06082b06010505070301");
  });

  it("uses UTCTime through 2049 and GeneralizedTime from 2050 (RFC 5280 4.1.2.5)", () => {
    expect(timeAt("2049-12-31T23:59:59.999Z")).toBe("17:491231235959Z");
    expect(timeAt("2050-01-01T00:00:00Z")).toBe("18:20500101000000Z");
    expect(timeAt("1949-06-01T00:00:00Z")).toBe("18:19490601000000Z");
  });

  it("encodes bit strings with their unused-bit count", () => {
    const keyUsage = $bitString(Uint8Array.of(0xa0), 5);
    expect(hex(keyUsage)).toBe("030205a0");
  });

  it("rejects text outside printable ASCII instead of guessing a character set", () => {
    expect(hex($utf8String("localhost"))).toBe("0c096c6f63616c686f7374");
    expect(() => $ascii("café")).toThrow("printable ASCII");
    expect(() => $ascii("a\nb")).toThrow("printable ASCII");
  });
});
