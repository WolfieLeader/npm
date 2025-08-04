import { Buffer } from 'node:buffer';
import { $err, $ok, $stringifyError, type Result } from '~/error';
import type { EncodingFormat } from '~/types';

export function encode(data: string, format: EncodingFormat = 'utf8'): Result<{ bytes: Buffer }> {
  try {
    return $ok({ bytes: Buffer.from(data, format) });
  } catch (error) {
    return $err({ message: 'Failed to encode data', description: $stringifyError(error) });
  }
}

export function decode(data: Buffer, format: EncodingFormat = 'utf8'): Result<string> {
  try {
    return $ok(Buffer.from(data).toString(format));
  } catch (error) {
    return $err({ message: 'Failed to decode data', description: $stringifyError(error) });
  }
}
