import { $err, $ok, $stringifyError, type Result } from '~/error';

export type EncodingFormat = 'utf8' | 'base64' | 'base64url' | 'hex';

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

export function $encode(data: string, format: EncodingFormat = 'utf8'): Result<{ bytes: Uint8Array }> {
  try {
    switch (format) {
      case 'base64':
        return $ok({ bytes: $fromBase64(data) });
      case 'base64url':
        return $ok({ bytes: $fromBase64Url(data) });
      case 'hex':
        return $ok({ bytes: $fromHex(data) });
      case 'utf8':
        return $ok({ bytes: textEncoder.encode(data) });
      default:
        return $err({ msg: `Unsupported encode format: ${format}`, desc: 'Use base64, base64url, hex, or utf8' });
    }
  } catch (error) {
    return $err({ msg: 'Failed to encode data', desc: $stringifyError(error) });
  }
}

export function $decode(data: ArrayBuffer | Uint8Array, format: EncodingFormat = 'utf8'): Result<string> {
  try {
    const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
    switch (format) {
      case 'base64':
        return $ok($toBase64(bytes));
      case 'base64url':
        return $ok($toBase64Url(bytes));
      case 'hex':
        return $ok($toHex(bytes));
      case 'utf8':
        return $ok(textDecoder.decode(bytes));
      default:
        return $err({ msg: `Unsupported decode format: ${format}`, desc: 'Use base64, base64url, hex, or utf8' });
    }
  } catch (error) {
    return $err({ msg: 'Failed to decode data', desc: $stringifyError(error) });
  }
}

function $toBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000; // 32KB per chunk
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function $fromBase64(data: string): Uint8Array {
  const binary = atob(data);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function $toBase64Url(bytes: Uint8Array): string {
  return $toBase64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function $fromBase64Url(data: string): Uint8Array {
  let b64 = data.replace(/-/g, '+').replace(/_/g, '/');
  const padLen = (4 - (b64.length % 4)) % 4;
  b64 += '='.repeat(padLen);
  return $fromBase64(b64);
}

function $toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function $fromHex(data: string): Uint8Array {
  const clean = data.startsWith('0x') ? data.slice(2) : data;
  if (clean.length % 2 !== 0) throw new Error('Invalid hex string');
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = Number.parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}
