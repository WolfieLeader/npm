// Node 20.19 provides these globals, but @types/node 20 declares them only as values or not at all.
// Package code uses them as types, so the floor check declares them from Node's own modules.
type CryptoKey = import("node:crypto").webcrypto.CryptoKey;
declare var CryptoKey: typeof import("node:crypto").webcrypto.CryptoKey;
type TextEncoder = import("node:util").TextEncoder;
type TextDecoder = import("node:util").TextDecoder;
