// A minimal DER encoder (ITU-T X.690) for the certificate this package writes.
// It uses only standard JavaScript (`Uint8Array`, no `Buffer`), so it runs on any runtime.

/** DER `NULL`. */
export const DER_NULL: Uint8Array = Uint8Array.of(0x05, 0x00);
/** DER `BOOLEAN TRUE`. */
export const DER_TRUE: Uint8Array = Uint8Array.of(0x01, 0x01, 0xff);

function $concat(parts: readonly Uint8Array[]): Uint8Array {
  let length = 0;
  for (const part of parts) length += part.length;
  const out = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

/** Encodes a definite length: one byte below 128, otherwise `0x80 | n` followed by `n` big-endian bytes. */
export function $length(length: number): Uint8Array {
  if (length < 0x80) return Uint8Array.of(length);
  const bytes: number[] = [];
  for (let rest = length; rest > 0; rest = Math.floor(rest / 256)) bytes.unshift(rest % 256);
  return Uint8Array.of(0x80 | bytes.length, ...bytes);
}

/** Encodes one tag-length-value element whose value is `contents` joined. */
function $tlv(tag: number, ...contents: Uint8Array[]): Uint8Array {
  const value = $concat(contents);
  return $concat([Uint8Array.of(tag), $length(value.length), value]);
}

export function $sequence(...items: Uint8Array[]): Uint8Array {
  return $tlv(0x30, ...items);
}

export function $set(...items: Uint8Array[]): Uint8Array {
  return $tlv(0x31, ...items);
}

/** A context-specific constructed element, such as `[0] EXPLICIT`. */
export function $explicit(tagNumber: number, ...items: Uint8Array[]): Uint8Array {
  return $tlv(0xa0 | tagNumber, ...items);
}

/** A context-specific primitive element, such as a `GeneralName` choice. */
export function $implicit(tagNumber: number, value: Uint8Array): Uint8Array {
  return $tlv(0x80 | tagNumber, value);
}

/** Encodes big-endian unsigned `bytes` as a DER `INTEGER`: leading zeros dropped, one `0x00` added before a set high bit. */
export function $unsignedInteger(bytes: Uint8Array): Uint8Array {
  let start = 0;
  while (start < bytes.length - 1 && bytes[start] === 0) start++;
  const value = bytes.length === 0 ? Uint8Array.of(0) : bytes.subarray(start);
  const sign = ((value[0] ?? 0) & 0x80) === 0 ? new Uint8Array(0) : Uint8Array.of(0);
  return $tlv(0x02, sign, value);
}

/** Encodes a dotted OID such as `"2.5.4.3"`. Each arc after the first two is base-128 with continuation bits. */
export function $oid(dotted: string): Uint8Array {
  const [first = 0, second = 0, ...rest] = dotted.split(".").map(Number);
  const bytes: number[] = [];
  for (const arc of [first * 40 + second, ...rest]) {
    const chunk = [arc % 0x80];
    for (let high = Math.floor(arc / 0x80); high > 0; high = Math.floor(high / 0x80))
      chunk.unshift(0x80 | (high % 0x80));
    bytes.push(...chunk);
  }
  return $tlv(0x06, Uint8Array.from(bytes));
}

/** The bytes of printable ASCII `text`. Anything else throws, so no string type here needs a character set. */
export function $ascii(text: string): Uint8Array {
  if (!/^[\x20-\x7e]*$/.test(text)) throw new Error("DER text must be printable ASCII");
  return Uint8Array.from(text, (char) => char.codePointAt(0) ?? 0);
}

export function $utf8String(text: string): Uint8Array {
  return $tlv(0x0c, $ascii(text));
}

export function $octetString(bytes: Uint8Array): Uint8Array {
  return $tlv(0x04, bytes);
}

/** A `BIT STRING` whose last byte has `unusedBits` padding bits. */
export function $bitString(bytes: Uint8Array, unusedBits = 0): Uint8Array {
  return $tlv(0x03, Uint8Array.of(unusedBits), bytes);
}

/** RFC 5280 time: `UTCTime` for 1950 through 2049, `GeneralizedTime` otherwise. Seconds precision, always UTC. */
export function $time(date: Date): Uint8Array {
  const digits = date.toISOString().slice(0, 19).replaceAll(/\D/g, "");
  const year = date.getUTCFullYear();
  return year >= 1950 && year < 2050 ? $tlv(0x17, $ascii(`${digits.slice(2)}Z`)) : $tlv(0x18, $ascii(`${digits}Z`));
}
