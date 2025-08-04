import { Buffer } from 'node:buffer';

export function $encode(data: string, format: 'base64' | 'base64url' | 'hex' | 'utf8' = 'base64url'): Buffer {
  return Buffer.from(data, format);
}

export function $decode(data: Buffer, format: 'base64' | 'base64url' | 'hex' | 'utf8' = 'base64url'): string {
  return Buffer.from(data).toString(format);
}
