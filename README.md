<p align="center">
  <img src="https://github.com/WolfieLeader/get-client-ip/blob/main/assets/banner.svg" align="center" alt="banner" />

  <h1 align="center" style="font-weight:900;">get-client-ip</h1>

  <p align="center">
    The Easiest Way to <br/>
    Get Your Clients IP
  </p>
</p>

<p align="center">
<a href="https://opensource.org/licenses/MIT" rel="nofollow"><img src="https://img.shields.io/github/license/WolfieLeader/get-client-ip?color=DC343B" alt="License"></a>
<a href="https://www.npmjs.com/package/get-client-ip" rel="nofollow"><img src="https://img.shields.io/npm/v/get-client-ip?color=0078D4" alt="npm version"></a>
<a href="https://www.npmjs.com/package/get-client-ip" rel="nofollow"><img src="https://img.shields.io/npm/dy/get-client-ip.svg?color=03C03C" alt="npm downloads"></a>
<a href="https://github.com/WolfieLeader/get-client-ip" rel="nofollow"><img src="https://img.shields.io/github/stars/WolfieLeader/get-client-ip" alt="stars"></a>

</p>

## Installation 🔥

```bash
npm install get-client-ip
```

## Usage 🎯

This is how you can use the `get-client-ip` package in your Express application to get the client's IP address,
this package also works on NestJS

```typescript
import { getClientIp } from 'get-client-ip';

app.get('/', getClientIp, (req, res) => {
  res.send(`Your IP is: ${req.clientIp}`);
});
```

## Headers ⛑️

```typescript
//Standard headers used by Amazon EC2, Heroku, and many others.
req.headers['x-client-ip'];
//Load balancers (AWS ELB) or proxies (may return multiple IP addresses in the format: "client IP, proxy 1 IP, proxy 2 IP" so we need to pay attention).
req.headers['x-forwarded-for'];

req.headers['forwarded-for'];

req.headers['x-forwarded'];

req.headers.forwarded;
// Nginx proxy/FastCGI, alternative to X-Forwarded-For, used by some proxies.
req.headers['x-real-ip'];
// Cloudflare, applied to every request to the origin.
req.headers['cf-connecting-ip'];
// Fastly and Firebase hosting header (When forwarded to cloud function).
req.headers['fastly-client-ip'];
// Akamai and Cloudflare: True-Client-IP.
req.headers['true-client-ip'];

req.headers['x-cluster-client-ip'];
// Google App Engine app identity.
req.headers['x-appengine-user-ip'];
// Cloudflare fallback header.
req.headers['Cf-Pseudo-IPv4'];

req.connection.remoteAddress;

req.connection.socket.remoteAddress;

req.socket.remoteAddress;
```

## Credit 💪🏽

We want to thank [Petar Bojinov](https://github.com/pbojinov) for the inspiration.
