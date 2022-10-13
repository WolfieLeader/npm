# Get Client Ip

## Description

This is a simple library that allows you to get the client ip address.

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
  const ip = getClientIp.getIp(req);
  res.send(ip);
});
```

### Getting The Client Ip Using Middleware:

```javascript
app.use(getClientIp.middleware());

app.get("/", (req, res) => {
  const ip = req.clientIp;
  res.send(ip);
});
```

### Credits:

We want to thank [Petar Bojinov](https://github.com/pbojinov) for the inspiration.
