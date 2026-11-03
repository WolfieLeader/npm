/** Output of cipher-kit 4.2.0 (Node kit) with `additionalData`. Regenerating these defeats their purpose. */
export const aad = {
  secret: "Secret0123456789Secret0123456789",
  text: "🦊 secret stuff ~ !@#$%^&*()_+ 日本語",
  object: {
    user: "Alice",
    n: 1,
    tags: ["a", "🌍"],
  },
  ciphertexts: [
    {
      name: "ASCII string AAD",
      key: { algorithm: "aes256gcm" },
      encoding: "base64url",
      additionalData: "user:42",
      ciphertext: "5SKZw58ppOnW0WYr.aIpJrQT7iT7qQyBKn84dsZYx1ojpUC3MH2QtDW8dop6cbfyOxyOND9Lf.7kdtQC9Cj58MG-Hbo-xMIA.",
    },
    {
      name: "byte AAD, AES-128, hex",
      key: { algorithm: "aes128gcm" },
      encoding: "hex",
      additionalData: new Uint8Array([0, 1, 2, 253, 254, 255]) as Uint8Array,
      ciphertext:
        "489c9c7fd8ce1334f031d73e.88422cc4187090b26c9f2b35c4444897f557df1c9e468ace0f18d642997d5658e8c384db5e11e43cfd14.35e565a1c0cf56e0076e9ebc8bd4cc1e.",
    },
    {
      name: "non-ASCII string AAD, base64",
      key: { algorithm: "aes256gcm" },
      encoding: "base64",
      additionalData: "ｒｅｃｏｒｄ/日本/🦊",
      ciphertext: "NMsx6N5rYzIR1esb.P5nlCvGvvyqM8UdkOjYonmHl5wdWyCOufWz4jlmsg9pIg38rWYnqXvHi.IdyDLLMjY76Prm9FA2sBOA==.",
    },
  ],
  objectCiphertext: {
    additionalData: "invoice:2026-0001",
    ciphertext: "VC3ddCmpPorAdkFn.HCZSzU28p99naunIB5S1yvJ01tMNHBrbVYwX3NT1C_nkyU9-znG3HEPL.pRJrfOf2vDCRsKbyWSRWWw.",
  },
} as const;
