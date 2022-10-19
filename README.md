# Get Client IP

## Description

A simple tool that allows you to manage IPs easily.

## Installation

npm:

```bash
npm install get-client-ip
```

## Usage

### Importing The Library:

```javascript
// CommonJs
const getClientIp = require("get-client-ip");

// ES6
import getClientIp from "get-client-ip";
```

### Getting The Client Ip:

```javascript
app.get("/", (req, res) => {
  const ip = getClientIp(req);
  res.send(ip);
});
```

### Headers:

```javascript
//Standard headers used by Amazon EC2, Heroku, and many others.
req.headers["x-client-ip"];
//Load balancers (AWS ELB) or proxies (may return multiple IP addresses in the format: "client IP, proxy 1 IP, proxy 2 IP" so we need to pay attention).
req.headers["x-forwarded-for"];
//
req.headers["forwarded-for"];
//
req.headers["x-forwarded"];
//
req.headers.forwarded;
// Nginx proxy/FastCGI, alternative to X-Forwarded-For, used by some proxies.
req.headers["x-real-ip"];
// Cloudflare, applied to every request to the origin.
req.headers["cf-connecting-ip"];
// Fastly and Firebase hosting header (When forwarded to cloud function).
req.headers["fastly-client-ip"];
// Akamai and Cloudflare: True-Client-IP.
req.headers["true-client-ip"];
//
req.headers["x-cluster-client-ip"];
// Google App Engine app identity.
req.headers["x-appengine-user-ip"];
// Cloudflare fallback header.
req.headers["Cf-Pseudo-IPv4"];
//
req.connection.remoteAddress;
//
req.connection.socket.remoteAddress;
//
req.socket.remoteAddress;
```

### Credits:

We want to thank [Petar Bojinov](https://github.com/pbojinov) for the inspiration.
