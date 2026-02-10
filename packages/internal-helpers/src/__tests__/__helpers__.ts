export const ascii = "Hello, World!";
export const unicode = "Héllo, Wörld! 🌍🚀 日本語テスト";

export const latin1Bytes = Uint8Array.from({ length: 256 }, (_, i) => i);
export const largeBinary = Uint8Array.from({ length: 40_000 }, (_, i) => i % 256);
