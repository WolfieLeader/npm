import { expect, test } from "vitest";
import { lintRule } from "./__helpers__.ts";

const plain = [
  "export const a = (token: string, other: string) => token === other;",
  "export const b = (input: string, expectedSignature: string) => input !== expectedSignature;",
  "export const c = (input: string, row: { digest: string }) => row.digest === input;",
  "export const d = (input: string, HMAC: string) => input == HMAC;",
  "export const e = (input: string, passwordHash: string) => passwordHash != input;",
  "export const f = (input: string, keys: { apiKey: string }) => input === keys.apiKey;",
  "export const g = (input: string, API_KEY: string) => input === API_KEY;",
  `export const h = (header: string, env: { CLIENT_SECRET: string }) => header === \`Bearer \${env.CLIENT_SECRET}\`;`,
  "export const i = (input: string, hash: string) => input === (hash as string);",
  "export const j = (input: string, row: { token?: string }) => input === row.token!;",
  "",
].join("\n");

const metadata = [
  "type Row = { tokenType: string; tokenId: string; hashAlgorithm: string; digestEncoding: string; secretName: string; token: string };",
  "export const a = (x: Row, y: Row) => x.tokenType === y.tokenType && x.tokenId === y.tokenId;",
  "export const b = (x: Row, y: Row) => x.hashAlgorithm === y.hashAlgorithm && x.digestEncoding === y.digestEncoding;",
  "export const c = (x: Row, y: Row) => x.secretName === y.secretName && x.token.length === y.token.length;",
  "export const d = (x: Row, SIGNATURE_LENGTH: number, HASH_SIZE: number) => x.token.length === SIGNATURE_LENGTH + HASH_SIZE;",
  "export const e = (token: string | undefined) => token === undefined || token === null || typeof token === 'string';",
  "export const f = (hash: string) => hash === 'sha256' || hash !== '';",
  "export const g = (input: string, name: string) => input === name;",
  "export const h = (tokenLength: number, digestSize: number) => tokenLength === digestSize;",
  "",
].join("\n");

test("rejects plain equality on secrets, tokens, signatures, digests, hashes, HMACs, passwords and API keys", () => {
  const result = lintRule("no-plain-secret-compare", { "src/plain.ts": plain });

  expect(
    result.findings.map((finding) => `${String(finding.line)} ${finding.message.split(" ")[0] ?? ""}`),
    result.output,
  ).toStrictEqual([
    "1 `token`",
    "2 `expectedSignature`",
    "3 `digest`",
    "4 `HMAC`",
    "5 `passwordHash`",
    "6 `apiKey`",
    "7 `API_KEY`",
    "8 `CLIENT_SECRET`",
    "9 `hash`",
    "10 `token`",
  ]);
  expect(result.status).toBe(1);
});

test("the message names the value, the operator and the constant-time fix", () => {
  const result = lintRule("no-plain-secret-compare", { "src/plain.ts": plain });

  expect(result.findings[1]?.message).toBe(
    "`expectedSignature` looks secret and `!==` returns at the first different character, so compare it with a constant-time function such as `crypto.timingSafeEqual`.",
  );
});

test("accepts metadata names, lengths and comparisons with literals", () => {
  const result = lintRule("no-plain-secret-compare", { "src/metadata.ts": metadata });

  expect(result.findings, result.output).toStrictEqual([]);
  expect(result.status, result.output).toBe(0);
});

test("fails the lint run when the rule gets options", () => {
  expect(() =>
    lintRule("no-plain-secret-compare", { "a.ts": "export {};\n" }, '["error", { "pattern": "x" }]'),
  ).toThrow("Rule 'local/no-plain-secret-compare' does not accept options");
});
