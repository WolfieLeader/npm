# npm packages

This monorepo publishes small TypeScript libraries to npm: `cipher-kit`, `compress-kit`, `generate-certs`,
`get-client-ip` and `modern-cookies`. `@internal/helpers` is private and bundled into `cipher-kit` and `compress-kit`.
`tools/lint-rules` holds the repo's custom oxlint rules. `examples/*` are runnable apps that use the local packages.

## Commands

Use Node 26 (`.node-version`) and the pnpm in `packageManager`. Run every command from the repo root.

- `pnpm install`: install. It also points git at `.githooks/`.
- `pnpm verify`: CI's checks, stopping at the first failure, plus gitleaks, actionlint and zizmor when installed.
  Run it after each change and before you push. The Node matrix, Bun, Deno and the security scans run only in CI.
- `pnpm build`, `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm fmt`: Turbo tasks and the formatter.
- `pnpm smoke`, `pnpm knip`: packed-tarball imports and types, unused code. The build itself runs publint and attw.
- `pnpm workers`: cipher-kit and compress-kit inside workerd, the Cloudflare Workers runtime.
- `bash scripts/test-on.sh bun` or `deno`: every test suite inside that runtime.
- One package: `pnpm --filter cipher-kit test`. One example: `pnpm --filter example-express5 start`.

## How we build

People and agents copy what they see. The codebase and its checks carry the rules; this file is the last resort.

- Keep `main` safe to copy: no workaround, unexplained disable, dead code or half-finished migration lands.
- Put each rule on the strongest rung that can hold it, and say why each lower rung fails before you climb:
  1. Types and code shape (the strict `tsconfig.base.json`, `Result` types, deleting the wrong path).
  2. A built-in oxlint rule, including `no-restricted-properties` and `no-restricted-imports` with a message.
  3. A custom rule in `tools/lint-rules`, only when no built-in can express it. It ships with integration tests.
  4. knip, then a test, then a git hook.
  5. A line here. It costs every reader's attention, so prefer a check.
- When a mistake gets through, add the check that stops the next one in the same change as the fix.
- Prove a new check: it fails on the old code and passes on the fix. Random input rarely hits one exact character,
  so property tests mix known edge cases into their generators.
- A review finding is a claim. Verify it against the source, then fix it with a test or reject it with evidence.
- Replace a pattern in one wave: move every caller, then delete the old path. A major release ships no legacy shim.
- Tooling without a current job is slop: delete it. A new rule lands with the first code it guards.
- Measure a check before it lands and keep `pnpm verify` fast. Record a rejected rule and its reason in the config.
- Autofixes can change behavior. Run typecheck and tests after `--fix`.
- Fix the cause of a failing check, or change the rule with a reason. Every `oxlint-disable` states why after `--`.
- The why goes in a test name, a lint message or a config reason, not a code comment. Public exports keep JSDoc:
  it is the consumer's documentation.
- Take versions, APIs and config options from current docs, release notes or installed source, never from memory.
- Do only what the task needs (KISS, YAGNI). Report unrelated issues as follow-ups.

## Paved paths

| Job                                | Paved path                                                                        | Check                                                                        |
| ---------------------------------- | --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Report an expected failure         | Return a `Result` from `$ok` / `$err`; `try*` APIs never throw                    | Property tests with hostile input; `only-throw-error`                        |
| Compare a secret, hash or tag      | A constant-time compare                                                           | `local/no-plain-secret-compare`                                              |
| Make random bytes                  | `crypto.getRandomValues` or `randomBytes`                                         | `no-restricted-properties` on `Math.random`                                  |
| Encode or decode base64, hex, utf8 | The `@internal/helpers` codecs, shared by Node and Web                            | `no-restricted-globals`; round-trip property tests                           |
| Describe an error                  | A fixed message that never echoes input, keys or plaintext                        | Property tests assert a sentinel input never appears                         |
| Keep stored data readable          | Never change a stored format in place; a writer checks its output with the reader | Golden tests against the published release; write-equals-read property tests |
| Parse a header or other text       | Read proxy-appended data from the right; reject what you can't parse              | Property tests with a client-controlled prefix                               |
| Log from a library                 | An optional `logger` option                                                       | `no-console`                                                                 |
| Match untrusted text               | A linear regex literal                                                            | `regexp/*`, including `no-super-linear-move`                                 |
| Assert in a test                   | The exact expected value                                                          | `vitest/no-restricted-matchers`, strict equal                                |
| Add a runtime dependency           | Ask the owner first                                                               | tsdown `deps.onlyImport`                                                     |

## Proof in a PR

- Bug fix: a test that fails before the fix and passes after, from the same command.
- New check: it fails on a bad fixture and passes on a good one.
- Behavior change: the package's `CHANGELOG.md` and the JSDoc say so. READMEs describe only the current version.
- Say what you did not verify.

## Library invariants

- Semver is strict. Changing an output format is a breaking change: ciphertext or compressed string format,
  default salt or KDF parameters, cookie attributes, or the returned IP address.
- The Node and Web implementations of `cipher-kit` produce identical results for the same input.
- Every package ships dual ESM and CJS with types. The build runs publint and attw; both must pass.
- Runtime support is `engines.node` (Node 20 and later), Bun, Deno 2 and, for cipher-kit and compress-kit, Workers.
  CI runs the tests on the first release of Node 20.19, 22 and 24, on Node 26, Bun and Deno, and the smoke test on Node 20.0 and 21.

## Upgrades

- Dependabot opens grouped weekly PRs. pnpm's `minimumReleaseAge` holds a new version back for a day.
- To adopt a release sooner, add its exact `name@version` to `minimumReleaseAgeExclude`; pnpm prunes the entry later.
- Dependabot cannot update tools a workflow downloads with curl. The weekly `Tool pins` workflow (`pnpm tool-pins`) fails when one is behind; bump its URL version and SHA-256 together.
- On an oxlint upgrade, recheck the rules marked nursery in `.oxlintrc.json`.

## Release

- Bump the package version and add its `CHANGELOG.md` entry in a PR.
- After the merge, the owner runs Actions → Release and picks the package. It publishes from `main` through npm
  trusted publishing, so no npm token exists.

## Never

- Publish, push to `main`, or merge, unless the owner names that exact action. The `pre-push` hook refuses `main`.
