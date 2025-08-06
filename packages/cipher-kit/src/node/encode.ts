import { Buffer } from 'node:buffer';
import { $err, $ok, $stringifyError, type Result } from '~/error';
import type { EncodingFormat } from '~/types';

export function encode(data: string, format: EncodingFormat = 'utf8'): Result<{ bytes: Buffer }> {
  try {
    return $ok({ bytes: Buffer.from(data, format) });
  } catch (error) {
    return $err({ msg: 'Failed to encode data', desc: $stringifyError(error) });
  }
}

export function decode(data: Buffer, format: EncodingFormat = 'utf8'): Result<string> {
  try {
    return $ok(Buffer.from(data).toString(format));
  } catch (error) {
    return $err({ msg: 'Failed to decode data', desc: $stringifyError(error) });
  }
}
