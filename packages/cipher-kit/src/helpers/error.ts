export { $err, $fmtError, $fmtResultErr, $ok, type ErrorStruct, type Result } from "@internal/helpers";

export function title(platform: "web" | "node", title: string): string {
  return `${platform === "web" ? "Crypto Web API" : "Crypto NodeJS API"} - ${title}`;
}
