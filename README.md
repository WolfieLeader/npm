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

### Credits:

We want to thank [Petar Bojinov](https://github.com/pbojinov) for the inspiration.
