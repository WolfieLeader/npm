# Ip Master

## Description

A simple tool that allows you to manage IPs easily.

## Installation

npm:

```bash
npm install ip-master
```

## Usage

### Importing The Library:

```javascript
// CommonJs
const ipMaster = require("ip-master");

// ES6
import ipMaster from "ip-master";
```

### Getting The Client Ip:

```javascript
app.get("/", (req, res) => {
  const ip = ipMaster.getClientIp(req);
  res.send(ip);
});
```

### Getting The Client Ip Using Middleware:

```javascript
app.use(ipMaster.middleware());

app.get("/", (req, res) => {
  const ip = req.clientIp;
  res.send(ip);
});
```

### Credits:

We want to thank [Petar Bojinov](https://github.com/pbojinov) for the inspiration.
