// Runs the real oxlint binary on fixture files in a temporary directory, with only the local plugin turned on.
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const oxlint = fileURLToPath(new URL("../../node_modules/.bin/oxlint", import.meta.url));
const plugin = fileURLToPath(new URL("../index.ts", import.meta.url));

interface Finding {
  code: string | undefined;
  file: string;
  line: number;
  message: string;
}

export interface LintResult {
  status: number | null;
  findings: Finding[];
  output: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;

function toFinding(value: unknown): Finding {
  const labels = isRecord(value) && Array.isArray(value["labels"]) ? (value["labels"] as unknown[]) : [];
  const span = isRecord(labels[0]) ? labels[0]["span"] : undefined;
  const line = isRecord(span) ? span["line"] : undefined;

  if (!isRecord(value) || typeof value["filename"] !== "string" || typeof value["message"] !== "string") {
    throw new TypeError(`oxlint wrote a diagnostic this helper cannot read: ${JSON.stringify(value)}`);
  }

  return {
    code: typeof value["code"] === "string" ? value["code"] : undefined,
    file: value["filename"],
    line: typeof line === "number" ? line : 0,
    message: value["message"],
  };
}

/** Parses oxlint's JSON report and throws when oxlint crashed, wrote no report, or reported a diagnostic without a rule. */
function readReport(stdout: string, output: string, status: number | null): Finding[] {
  if (!stdout.trimStart().startsWith("{")) {
    throw new Error(`oxlint wrote no JSON report (exit status ${String(status)}):\n${output}`);
  }

  const report: unknown = JSON.parse(stdout);
  const diagnostics = isRecord(report) ? report["diagnostics"] : undefined;

  if (!Array.isArray(diagnostics)) throw new Error(`oxlint's report has no diagnostics list:\n${output}`);

  const findings = diagnostics.map((diagnostic: unknown) => toFinding(diagnostic));
  const crashes = findings.filter((finding) => finding.code === undefined);

  if (crashes.length > 0) {
    const messages = crashes.map((crash) => crash.message).join("\n");
    throw new Error(
      `oxlint reported a diagnostic with no rule code (a crashed rule or a file that does not parse):\n${messages}`,
    );
  }

  return findings;
}

/** Writes `files` and a config that sets `rule` from the local plugin, runs oxlint, and returns that rule's findings. */
export function lintRule(rule: string, files: Readonly<Record<string, string>>, setting = '"error"'): LintResult {
  const created = mkdtempSync(join(tmpdir(), "lint-rules-"));
  // macOS links the temporary folder through /var; oxlint reports paths relative to the real one.
  const directory = realpathSync(created);
  const config = `{ "jsPlugins": [{ "name": "local", "specifier": ${JSON.stringify(plugin)} }], "plugins": [], "categories": { "correctness": "off" }, "rules": { "local/${rule}": ${setting} } }`;

  try {
    writeFileSync(join(directory, ".oxlintrc.json"), config);

    for (const [path, content] of Object.entries(files)) {
      mkdirSync(dirname(join(directory, path)), { recursive: true });
      writeFileSync(join(directory, path), content);
    }

    const result = spawnSync(oxlint, ["--format", "json", "-c", join(directory, ".oxlintrc.json"), "."], {
      cwd: directory,
      encoding: "utf8",
      timeout: 30_000,
    });
    const output = `${result.stdout}${result.stderr}`;
    const findings = readReport(result.stdout, output, result.status).filter(
      (finding) => finding.code === `local(${rule})`,
    );

    return { status: result.status, findings, output };
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}
