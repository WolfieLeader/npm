import * as fc from "fast-check";
import { describe, expect, test } from "vitest";
import { getClientIp } from "~/index.js";
import type { GetClientIpOptions, IpRequest } from "~/index.js";

const PROXY = "10.0.0.5";
// Client-controlled text, rich in the characters header parsers trip on.
const syntaxChar = fc.constantFrom('"', "\\", ",", ";", "=", " ", "[", "]", ":", "\t");
const clientText = fc.string({ unit: fc.oneof(fc.string({ unit: "binary", minLength: 1, maxLength: 1 }), syntaxChar) });

function behindProxy(headers: IpRequest["headers"]): IpRequest {
  return { headers, socket: { remoteAddress: PROXY } };
}

describe("get-client-ip properties", () => {
  test.each([
    ["x-forwarded-for", (prefix: string) => `${prefix}, 203.0.113.9`, "203.0.113.9"],
    ["forwarded", (prefix: string) => `${prefix}, for=203.0.113.9`, "203.0.113.9"],
    ["forwarded", (prefix: string) => `${prefix}, for="[2001:db8::9]:443"`, "2001:db8::9"],
  ] as const)("no client-sent %s prefix hides the hop a trusted proxy appended", (header, append, expected) => {
    const options: GetClientIpOptions = { forwardedHeader: header };
    fc.assert(
      fc.property(clientText, (prefix) => {
        const req = behindProxy({ [header]: append(prefix) });
        expect(getClientIp(req, options)).toBe(expected);
      }),
    );
  });

  test("any header values, socket address or req.ip return a string or undefined, never a throw", () => {
    const headerValue = fc.oneof(clientText, fc.array(clientText), fc.constant(undefined));
    fc.assert(
      fc.property(
        headerValue,
        headerValue,
        fc.option(clientText, { nil: undefined }),
        fc.option(clientText, { nil: undefined }),
        (xff, forwarded, remoteAddress, ip) => {
          const req = { headers: { "x-forwarded-for": xff, forwarded }, socket: { remoteAddress }, ip } as IpRequest;
          for (const forwardedHeader of ["x-forwarded-for", "forwarded"] as const) {
            const result = getClientIp(req, { forwardedHeader, trustedHeaders: ["x-forwarded-for"] });
            expect(result === undefined || typeof result === "string").toBe(true);
          }
        },
      ),
    );
  });
});
