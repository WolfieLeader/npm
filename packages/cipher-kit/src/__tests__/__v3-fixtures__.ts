/** Output of the published cipher-kit@3.0.0 (Node build). Regenerating these defeats their purpose. */
export const v3 = {
  secret: "Secret0123456789Secret0123456789",
  text: "🦊 secret stuff ~ !@#$%^&*()_+ 日本語",
  password: "correct horse ｂａｔｔｅｒｙ",
  object: {
    user: "Alice",
    n: 1,
    tags: ["a", "🌍"],
  },
  keys: {
    default: {},
    aes128: {
      algorithm: "aes128gcm",
    },
    custom: {
      algorithm: "aes256gcm",
      digest: "sha512",
      salt: "custom-salt-123",
      info: "my-app/v1",
    },
    nfkc: {
      salt: "ｓａｌｔ-NFKC",
      info: "ｉｎｆｏ-NFKC",
    },
  },
  ciphertexts: [
    {
      key: "default",
      encoding: "base64url",
      ciphertext: "VaD_2icCb0Hysjsa.HUUBYQVfQ_vjjKQ4-qsBiUwcmLTmFHYWUEVIWTXJanXWKzy3KtfomWHj.ynjxjWaSKKFNyhEBwsshAQ.",
    },
    {
      key: "default",
      encoding: "base64",
      ciphertext: "cXdjo1zaDdk5NqEq.IIWp2i8uY/G8ppObJcE6AoOHwJ7GIiS0j2Oq3sguIz1vuQynROVDZUbY.hl2vWmguxDO5UGB+z7dJyQ==.",
    },
    {
      key: "default",
      encoding: "hex",
      ciphertext:
        "0d10a59825a601fe9bc16bc7.4a00576c927f68a81b293799fdc7590e923a92964c5a8bbd3b63c2f2ea2cf7bf6a73cc632141b9460b62.246b8a0b2efaabe071b6f378a5e762a3.",
    },
    {
      key: "aes128",
      encoding: "base64url",
      ciphertext: "ZYRxXGpkzOd0K3zp.cNipOrdtObyWnBoitiAD_zoifmR_N61dBkcehPVO55psUh568ovBmCq7.gnMAz0X88HoXnEaxY_ah2w.",
    },
    {
      key: "aes128",
      encoding: "base64",
      ciphertext: "MjaYYE+4W4SPRfQb.uf7eH0CXRopt4iMYbtdR/6RIkFWcSnrzKmDi+5R9QpBkOh+UEYLJSChl.DtaWJVCSZxpAbV9VyQtnHg==.",
    },
    {
      key: "aes128",
      encoding: "hex",
      ciphertext:
        "e2b846e3d7895e3c0be2a458.562ae58e58ced83b172c9f20ad05a8bd79331524f77900891a9a757442eb1ab51567d49e759f922bdc61.9ff1e8b07c70bf1fd485b5d7fbe9dbf9.",
    },
    {
      key: "custom",
      encoding: "base64url",
      ciphertext: "LYbKyoTSrXaCWyaN.NvgeopxFRJNXOaZ1F9w5eQ_Y-vDYjze1xK2AoOIf3cuUUSMyfmFulknC.L4hxSz2KNMZRDpQOB-yxjQ.",
    },
    {
      key: "custom",
      encoding: "base64",
      ciphertext: "Z4b163nxZzff+bKj.wQLARJR/Qx2hjW/9xVEoHZw2frcKZj6Y5lEG05iVMEbjbhR5PLmrC1Ta.fCWfVFygzu0rZzwVXsfJ2Q==.",
    },
    {
      key: "custom",
      encoding: "hex",
      ciphertext:
        "aac6bbb114b7306396c62b01.fa143b1bb031b9576e64871b3a296090e6fd55d91fc45cef2a515935d5a1aa49e58ccf1ef758bbc77d7f.3c1db09dd16c06b2fcbc9a31f8930e27.",
    },
    {
      key: "nfkc",
      encoding: "base64url",
      ciphertext: "Yy8-cg3y_w6p931j.I55_01JFcl6iSBbDBtk7zGnkwI18Wv4n86Sb-n4TIL8xlLzBUt5Dda06.fbdFJYYQO0xSP7GKZOtHOA.",
    },
    {
      key: "nfkc",
      encoding: "base64",
      ciphertext: "ghv3m2u/pfUBNbXB.Sf0bFocarzsi8SZlhHjnevLx7NhYE5c8Qii+2x9IPtRZY8Q3FBLgrM7A.J39m+4uyROEDVP88vjrFWw==.",
    },
    {
      key: "nfkc",
      encoding: "hex",
      ciphertext:
        "073bc5b3c4bedfdaf3c290fd.5564c9c51c17cc4afe4cd7f8c88e777a2c2930c2e4c2303693f7b5e5a0c6fa8ccab34fb583b0f2e48d05.ca06224f14fe5a316133826e1a8e55d7.",
    },
  ],
  objects: [
    {
      key: "default",
      ciphertext: "lGZELV1AwXakDyuA.zzUTP6XPF5TsXy5SWDdTsM3GUto6lULQQCKYmt6QQym-dUr_Anivo77t.jA6BMwqhC5Mz7cLOJ2p3CA.",
    },
    {
      key: "aes128",
      ciphertext: "1kasDCT5A1ki4_Fp.EfS7WeqPU2AWIF964OVXRRVRRInlB9zE3UaCOLhKfp_Q-KGwjHvP8wxY.tAVgjFWCO3Vteq97fOWs0Q.",
    },
    {
      key: "custom",
      ciphertext: "7TTubUbDoOBvcVF1.X-Pe2AMPI1cTdGpq7V5Ksm8_4B60PbAWTwFqELUucYjHtU7OfjmeGw2e.08oLFNiK8TfGEzzN6C5vhw.",
    },
    {
      key: "nfkc",
      ciphertext: "-lnaXY1-iERFzk2Z.-egBesOnKFZrrGo54-rY6MNHopyoXZpwzfS2VBQ2CRF1d1r4EiF3YFcv.PfgmJx3tkSHl8ITLsc58uw.",
    },
  ],
  hashes: [
    {
      digest: "sha256",
      encoding: "base64url",
      hash: "6tELmQyIqKekgjw-A9BiILQBAPfFuXm2PxIShYRoEF0",
    },
    {
      digest: "sha256",
      encoding: "hex",
      hash: "ead10b990c88a8a7a4823c3e03d06220b40100f7c5b979b63f1212858468105d",
    },
    {
      digest: "sha384",
      encoding: "base64url",
      hash: "aGTDjDn8PsEQcHivcpRw-HJW-J6y1nEB2yNJA4Mz2CT22OE7HlcPnbgw0w8OCuRY",
    },
    {
      digest: "sha384",
      encoding: "hex",
      hash: "6864c38c39fc3ec1107078af729470f87256f89eb2d67101db2349038333d824f6d8e13b1e570f9db830d30f0e0ae458",
    },
    {
      digest: "sha512",
      encoding: "base64url",
      hash: "ZqiBjjwbwoo5IhnPijgmlXM9_tGS4eoENkl9nj_Gev_Cf4a8BL5YZXyXzHefpThVX2QsICU_ksMktnumGuTetw",
    },
    {
      digest: "sha512",
      encoding: "hex",
      hash: "66a8818e3c1bc28a392219cf8a382695733dfed192e1ea0436497d9e3fc67affc27f86bc04be58657c97cc779fa538555f642c20253f92c324b67ba61ae4deb7",
    },
  ],
  passwords: [
    {
      verifyOptions: {},
      hash: "NsI2JpMOHaRODTPhptjxBMZMNjEC3qsWy8SBP29JQAB7L4gmCU94Sdk5gMJU2suQ_3t4JCUW0yeBkY3_9sOPdA",
      salt: "was9hKFMcN3fvRwpx6Bj6Q",
    },
    {
      verifyOptions: {
        digest: "sha256",
        iterations: 100_000,
        keyLength: 32,
        inputEncoding: "hex",
      },
      hash: "89865554ec5e92efe5d9faef312d4b1baa20cf78c8c3912798da307cbf56c5a6",
      salt: "ec08708c56e1ce7e",
    },
  ],
} as const;
