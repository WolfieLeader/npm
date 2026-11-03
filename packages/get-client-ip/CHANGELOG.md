# Changelog

## 5.1.0

- Supports Node.js 20 and later, and is tested on Bun and Deno 2.

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
