import { Buffer } from 'node:buffer';
import { ENCODING_FORMATS } from '~/helpers/consts';
import { $err, $fmtError, $ok, type Result } from '~/helpers/error';
import type { EncodingFormat } from '~/helpers/types';
import { $isStr } from '~/helpers/validate';

export function $convertStrToBytes(data: string, format: EncodingFormat = 'utf8'): Result<{ result: Buffer }> {
  if (!$isStr(data)) {
    return $err({
      msg: 'Crypto NodeJS API - String to Bytes: Empty data',
      desc: 'Data must be a non-empty string',
    });
  }
  if (!ENCODING_FORMATS.includes(format)) {
    return $err({
      msg: `Crypto NodeJS API - String to Bytes: Unsupported encode format: ${format}`,
      desc: 'Use base64, base64url, hex, utf8, or latin1',
    });
  }
  try {
    return $ok({ result: Buffer.from(data, format) });
  } catch (error) {
    return $err({ msg: 'Crypto NodeJS API - String to Bytes: Failed to convert data', desc: $fmtError(error) });
  }
}

export function $convertBytesToStr(data: Buffer, format: EncodingFormat = 'utf8'): Result<string> {
  if (!(data instanceof Buffer)) {
    return $err({
      msg: 'Crypto NodeJS API - Bytes to String: Invalid data type',
      desc: 'Data must be a Buffer',
    });
  }
  if (!ENCODING_FORMATS.includes(format)) {
    return $err({
      msg: `Crypto NodeJS API - Bytes to String: Unsupported format: ${format}`,
      desc: 'Use base64, base64url, hex, utf8, or latin1',
    });
  }
  try {
    return $ok(Buffer.from(data).toString(format));
  } catch (error) {
    return $err({ msg: 'Crypto NodeJS API - Bytes to String: Failed to convert data', desc: $fmtError(error) });
  }
}

export function $convertFormat(data: string, from: EncodingFormat, to: EncodingFormat): Result<{ result: string }> {
  if (!$isStr(data)) {
    return $err({
      msg: 'Crypto NodeJS API - Convert Format: Empty data',
      desc: 'Data must be a non-empty string',
    });
  }

  if (!ENCODING_FORMATS.includes(from) || !ENCODING_FORMATS.includes(to)) {
    return $err({
      msg: `Crypto NodeJS API - Convert Format: Unsupported format: from ${from} to ${to}`,
      desc: 'Use base64, base64url, hex, utf8, or latin1',
    });
  }

  const bytes = $convertStrToBytes(data, from);
  if (bytes.error) return $err({ msg: bytes.error.message, desc: bytes.error.description });

  const str = $convertBytesToStr(bytes.result, to);
  if (str.error) return $err({ msg: str.error.message, desc: str.error.description });

  return $ok({ result: str.result });
}
