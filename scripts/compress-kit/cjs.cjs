const assert = require("node:assert/strict");
const {
  compress,
  compressObj,
  decompress,
  decompressObj,
  tryCompress,
  tryCompressObj,
  tryDecompress,
  tryDecompressObj,
} = require("compress-kit");

assert.equal(typeof compress, "function");
assert.equal(typeof tryCompress, "function");
assert.equal(typeof decompress, "function");
assert.equal(typeof tryDecompress, "function");
assert.equal(typeof compressObj, "function");
assert.equal(typeof tryCompressObj, "function");
assert.equal(typeof decompressObj, "function");
assert.equal(typeof tryDecompressObj, "function");

// String roundtrip
const original = "Hello from CJS smoke test — compress roundtrip!";
const compressed = compress(original);
assert.equal(decompress(compressed), original);

// Object roundtrip
const obj = { a: 1, b: "two" };
const compressedObj = compressObj(obj);
assert.deepStrictEqual(decompressObj(compressedObj), obj);

console.log("compress-kit: all CJS tests OK");
