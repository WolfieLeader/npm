import type {
  CompressEncoding,
  CompressOptions,
  DecompressOptions,
  EightToFifteen,
  OneToNine,
  compress,
  compressObj,
  decompress,
  decompressObj,
  tryCompress,
  tryCompressObj,
  tryDecompress,
  tryDecompressObj,
} from "compress-kit";

const _compress: typeof compress = {} as typeof compress;
const _compressObj: typeof compressObj = {} as typeof compressObj;
const _decompress: typeof decompress = {} as typeof decompress;
const _decompressObj: typeof decompressObj = {} as typeof decompressObj;
const _tryCompress: typeof tryCompress = {} as typeof tryCompress;
const _tryCompressObj: typeof tryCompressObj = {} as typeof tryCompressObj;
const _tryDecompress: typeof tryDecompress = {} as typeof tryDecompress;
const _tryDecompressObj: typeof tryDecompressObj = {} as typeof tryDecompressObj;

const _encoding: CompressEncoding = "base64url";
const _compressOpts: CompressOptions = { level: 6, outputEncoding: "hex" };
const _decompressOpts: DecompressOptions = { inputEncoding: "base64url", maxOutputSize: 1024 };
const _level: OneToNine = 9;
const _windowBits: EightToFifteen = 15;
