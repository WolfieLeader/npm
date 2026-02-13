import { webcrypto } from "node:crypto";

if (typeof globalThis.crypto === "undefined") {
  Object.defineProperty(globalThis, "crypto", { value: webcrypto, configurable: true });
}
if (typeof globalThis.CryptoKey === "undefined") {
  Object.defineProperty(globalThis, "CryptoKey", { value: webcrypto.CryptoKey, configurable: true });
}
