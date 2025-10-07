import type { CIPHER_ENCODING, ENCODING } from "./encode";

/** Supported **cipher text** encodings for encrypted/hash outputs. */
export type CipherEncoding = (typeof CIPHER_ENCODING)[number];

/** Supported data encodings for **plain text/bytes** conversions. */
export type Encoding = (typeof ENCODING)[number];

export type OneToNine = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
export type EightToFifteen = 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15;

/**
 * Options for compression.
 *
 * ### 🍼 Explain Like I'm Five
 * You want to pack your toys (data) into a smaller box (compressed data) to save space.
 * You can choose how tightly to pack them (level), the size of the box (windowBits),
 * how much memory to use while packing (memLevel), and the method of packing (strategy).
 *
 * - `outputEncoding`: Output compressed data encoding (`'base64' | 'base64url' | 'hex'`) (default: `'base64url'`)
 * - `level`: Speed vs. compression trade-off (1-9; default: 6)
 * - `windowBits`: Size of the compression window: 2^windowBits (8-15; default: 15)
 * - `memLevel`: Memory usage for compression match finder (1-9; default: 8)
 * - `strategy`: Compression strategy (default: 'default')
 */
export interface CompressOptions {
  /** Encoding format for the output compressed data (default: `'base64url'`). */
  outputEncoding?: CipherEncoding;
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
   * - `"filtered"`: Optimized for data with small variations (e.g., images)
   * - `"huffmanOnly"`: Skips string matching, only Huffman coding (used for data with little to no redundancy)
   * - `"rle"`: Run-length-like data encoding (repetitions of bytes)
   * - `"fixed"`: Fixed Huffman coding (less optimal, but faster)
   */
  strategy?: "default" | "filtered" | "huffmanOnly" | "rle" | "fixed";
}

/**
 * Options for decompression.
 *
 * ### 🍼 Explain Like I'm Five
 * You want to unpack your toys (data) from a smaller box (compressed data) to play with them again.
 * You can choose how much memory to use while unpacking (memLevel) and the method of unpacking (strategy).
 *
 * - `inputEncoding`: Input compressed data encoding (`'base64' | 'base64url' | 'hex'`) (default: `'base64url'`)
 * - `windowBits`: Size of the compression window: 2^windowBits (8-15; default: 15)
 */
export interface DecompressOptions {
  /** Encoding format for the input compressed data (default: `'base64url'`). */
  inputEncoding?: CipherEncoding;
  /** Size of the compression window: 2^windowBits (8-15; default: 15). */
  windowBits?: EightToFifteen;
}
