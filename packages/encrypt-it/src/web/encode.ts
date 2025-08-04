const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

export function $encode(data: string, format: 'base64' | 'base64url' | 'hex' | 'utf8' = 'base64url'): Uint8Array {
  switch (format) {
    case 'base64':
      return $fromBase64(data);
    case 'base64url':
      return $fromBase64Url(data);
    case 'hex':
      return $fromHex(data);
    case 'utf8':
      return textEncoder.encode(data);
    default:
      throw new Error(`Unsupported encode format: ${format}`);
  }
}

export function $decode(
  data: ArrayBuffer | Uint8Array,
  format: 'base64' | 'base64url' | 'hex' | 'utf8' = 'base64url',
): string {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  switch (format) {
    case 'base64':
      return $toBase64(bytes);
    case 'base64url':
      return $toBase64Url(bytes);
    case 'hex':
      return $toHex(bytes);
    case 'utf8':
      return textDecoder.decode(bytes);
    default:
      throw new Error(`Unsupported decode format: ${format}`);
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
