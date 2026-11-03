# Changelog

## 5.1.0

- Supports Node.js 20.19 and later, and is tested on Bun and Deno 2.

## 5.0.0

Breaking changes:

- **Requires Node.js >= 22.12.**
- **`X-Forwarded-For` is read from the right.** v4 returned the leftmost entry, which any client can set. Now the first untrusted hop from the right is returned.
- **Vendor headers need opt-in.** `cf-connecting-ip`, `true-client-ip`, `fastly-client-ip`, `x-appengine-user-ip`, `cf-pseudo-ipv4`, `x-client-ip`, `x-real-ip`, `x-cluster-client-ip`, `forwarded-for`, and `x-forwarded` are ignored unless listed in `trustedHeaders`.
- **A trusted `req.ip` no longer wins.** When `req.ip` is inside `trustedProxies` (Express without `trust proxy` behind a private or loopback proxy), the forwarding chain is walked. v4 returned the proxy's address. Pass `trustedProxies: []` to keep the v4 result.
- **`Forwarded` needs opt-in.** Set `forwardedHeader: "forwarded"`. `X-Forwarded-For` is then ignored.
- **The second argument is now `options`.** `getClientIp(req, res)` no longer means middleware; use `getClientIp(req, res, next)`, `app.use(getClientIp)`, or `getClientIpMiddleware()`.
- **`req.clientIps` changed meaning.** It is the client followed by the trusted hops toward your server, ending with the socket peer. v4 listed every header entry.
- **Output is normalized.** IPv4-mapped IPv6 (`::ffff:1.2.3.4`) becomes IPv4, including `req.ip`. IPv6 is lowercase and compressed, and its zone ID is dropped (`fe80::1%eth0` becomes `fe80::1`).
- **A quoted `X-Forwarded-For` entry is an invalid hop.** v4 stripped the quotes from `"203.0.113.9"`. Proxies never quote it, so a quoted entry is client-written and stops the walk.
- **The middleware always sets `req.clientIp`.** It is `undefined` when no address resolves. v4 left the property untouched.
- **IPv6 trust uses real CIDR matching.** `fc::1` is no longer trusted (it is not in `fc00::/7`). `fe80::/10` now covers `fe80::`–`febf::`.
- **`0.0.0.0` and `::` are invalid hops.**

## 4.0.0

Breaking changes:

- **Headers are trusted only from a private or loopback peer.** When `req.ip` is unset, forwarding headers are read only if `req.socket.remoteAddress` is in `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `127.0.0.0/8`, or `169.254.0.0/16`, or is IPv6 `::1` or starts with `fe80:`, `fc`, or `fd`. For any other peer, the socket address is returned. 3.x read headers from any peer. Set Express's `trust proxy` so `req.ip` holds the client address.
- **Header order changed.** `cf-connecting-ip`, `true-client-ip`, `fastly-client-ip`, `x-appengine-user-ip`, and `cf-pseudo-ipv4` now come before `x-client-ip` and `x-forwarded-for`.
- **`Forwarded` is parsed per RFC 7239.** Its `for=` values are read. 3.x accepted only a bare IP in `Forwarded`.
- **Header entries are cleaned.** Ports, brackets, quotes, and IPv6 zone IDs are stripped before validation.
- **`req.connection.remoteAddress` is no longer read.** Only `req.socket.remoteAddress` is the fallback.
- **Requires Node.js >= 18.** The `express` peer dependency is gone. `getClientIp` takes any object that matches `IpRequest`.

Other changes:

- The middleware calls `next()` when no address resolves. 2.x and 3.x skipped it, so the request never reached the next handler.
- Exports the `IpRequest` type.

## 3.0.0

- `getClientIp` returns the client IP, or `undefined`. 2.x returned nothing.
- No other change to the published code. The package moved into the npm monorepo.

## 2.0.0

Breaking changes:

- **`getClientIp` is a named Express middleware.** Use `import { getClientIp } from "get-client-ip"`, then `app.use(getClientIp)` or call `getClientIp(req)`. It sets `req.clientIp` (the first address) and `req.clientIps` (all addresses) and returns nothing. Read `req.clientIp` after the call.
- **`req.ip` is checked first**, then the headers, then `req.socket.remoteAddress`, then `req.connection.remoteAddress`.
- **Only Express requests are supported.** The `req.info.remoteAddress` and `req.requestContext.identity.sourceIp` fallbacks are removed. `express` >= 4.21 is a peer dependency.
- **A missing request throws** `Request is undefined`. 1.1 returned `null`.

Other changes:

- Removes the stray `console.log` from 1.1.

## 1.1.0

- `getClientIp` accepts any request object, typed `unknown`, instead of an Express `Request`. It returns `null` instead of throwing when the request is missing.
- Falls back to `req.info.remoteAddress` and `req.requestContext.identity.sourceIp`. It no longer reads `req.connection.remoteAddress`.
- Known issue: 1.1.0 and 1.1.1 print `ips` with `console.log` when a header holds an array or a comma-separated list. 2.0.0 removes it.

## 1.0.0

- First stable release, with the same code as 0.1.5.
- The default export `getClientIp(req)` returns the first valid IP from `forwarded`, `x-client-ip`, `x-forwarded-for`, and other proxy headers. It falls back to `req.socket.remoteAddress` and `req.connection.remoteAddress`, then `null`. It throws when the request is missing.

## 0.0.1 to 0.1.4

- Early builds. 0.0.1 to 0.1.1 hold unrelated test code. 0.1.2 to 0.1.4 return raw header values from `getIp`. npm marks 0.0.1 to 0.1.3 deprecated ("Package no longer supported"). Use 1.0.0 or later.
