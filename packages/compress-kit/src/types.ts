import type { CipherEncoding } from "@internal/helpers";

export type CompressEncoding = CipherEncoding;

export type OneToNine = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
export type EightToFifteen = 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15;

/** Options for compression. */
export interface CompressOptions {
  /** Encoding format for the output compressed data (default: `'base64url'`). */
  outputEncoding?: CompressEncoding;
  /** Compression level (1-9; default: 6). */
  level?: OneToNine;
  /** Size of the compression window: 2^windowBits (8-15; default: 15). */
  windowBits?: EightToFifteen;
  /** Memory usage for compression match finder (1-9; default: 8). */
  memLevel?: OneToNine;
  /**
   * Compression strategy (default: 'default').
   *
   * - `"default"`: Balanced compression, the go-to option for most cases
   * - `"filtered"`: Optimized for data with small variations (e.g., numeric sequences)
   * - `"huffmanOnly"`: Skips string matching, only Huffman coding (used for data with little to no redundancy)
   * - `"rle"`: Run-length-like data encoding (repetitions of bytes)
   * - `"fixed"`: Fixed Huffman coding (less optimal, but faster)
   */
  strategy?: "default" | "filtered" | "huffmanOnly" | "rle" | "fixed";
}

/** Options for decompression. */
export interface DecompressOptions {
  /** Encoding format for the input compressed data (default: `'base64url'`). */
  inputEncoding?: CompressEncoding;
  /** Size of the compression window: 2^windowBits (8-15; default: 15). */
  windowBits?: EightToFifteen;
  /**
   * Maximum allowed decompressed output size in bytes.
   * For `.1.` (deflated) payloads, decompression uses streaming mode and aborts
   * as soon as the next chunk would exceed this limit.
   * For `.0.` (stored) payloads, the encoded size is pre-checked before decode,
   * then validated again against actual decoded bytes.
   */
  maxOutputSize?: number;
}
