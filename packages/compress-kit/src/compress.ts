import pako, { type DeflateFunctionOptions } from 'pako';
import { $decode, $encode } from './encode';
import { $err, $ok, $stringifyError, type Result } from './error';
import { $isStr, $parseToObj, $stringifyObj, isInCompressionFormat } from './utils';

const COMPRESSION_OPTIONS: DeflateFunctionOptions = {
  level: 6,
  windowBits: 15,
  memLevel: 7,
  strategy: 0,
  raw: false,
};

export function compress(data: string): Result<string> {
  if (!$isStr(data, 1)) {
    return $err({ msg: 'Empty string', desc: 'Cannot compress null or undefined string' });
  }

  const { bytes, error } = $encode(data, 'utf8');
  if (error) return $err(error);

  const decoded = $decode(bytes, 'base64url');
  if (decoded.error) return $err(decoded.error);

  try {
    const compressed = $decode(pako.deflate(bytes, COMPRESSION_OPTIONS), 'base64url');
    if (compressed.error) return $err(compressed.error);

    if (decoded.result.length <= compressed.result.length) return $ok(`${decoded.result}.0.`);
    return $ok(`${compressed.result}.1.`);
  } catch (error) {
    return $err({ msg: 'Compression error', desc: $stringifyError(error) });
  }
}

export function decompress(data: string): Result<string> {
  if (isInCompressionFormat(data) === false) {
    return $err({ msg: 'Invalid format', desc: 'String does not match expected compressed format' });
  }

  const str = data.slice(0, -3);
  if (!$isStr(str, 1)) return $err({ msg: 'Invalid input', desc: 'Input is not a valid string' });

  const { bytes, error } = $encode(str, 'base64url');
  if (error) return $err(error);

  try {
    if (data.endsWith('.1.')) return $ok(pako.inflate(bytes, { to: 'string' }));
    if (data.endsWith('.0.')) return $decode(bytes, 'utf8');

    return $err({ msg: 'Invalid compression type', desc: 'Expected .0. or .1. at the end of the string' });
  } catch (error) {
    return $err({ msg: 'Decompression error', desc: $stringifyError(error) });
  }
}

export function compressObj(data: Record<string, unknown>): Result<string> {
  const { result, error } = $stringifyObj(data);
  if (error) return $err(error);
  return compress(result);
}

export function decompressObj(data: string): Result<{ result: Record<string, unknown> }> {
  const { result, error } = decompress(data);
  if (error) return $err(error);
  return $parseToObj(result);
}
