# How will it work?

## Function getIp:

1. The function `getClientIp` will receive a request object as a parameter.
2. Firstly we gonna check if the request is an instance of Request from express.
3. Then we gonna check for headers.
4. If there are headers we are going to check the following headers:

   - `req.headers["x-client-ip"]`
     > Standard headers used by Amazon EC2, Heroku, and many others.
   - `req.headers["x-forwarded-for"]`
     > Load balancers (AWS ELB) or proxies (may return multiple IP addresses in the format: "client IP, proxy 1 IP, proxy 2 IP" so we need to pay attention).
   - `req.headers["forwarded-for"]`
     > Unknown
   - `req.headers["x-forwarded"]`
     > Unknown
   - `req.headers.forwarded`
     > Unknown
   - `req.headers["x-real-ip"]`
     > Nginx proxy/FastCGI, alternative to X-Forwarded-For, used by some proxies.
   - `req.headers["cf-connecting-ip"]`
     > Cloudflare, applied to every request to the origin.
   - `req.headers["fastly-client-ip"]`
     > Fastly and Firebase hosting header (When forwarded to cloud function).
   - `req.headers["true-client-ip"]`
     > Akamai and Cloudflare: True-Client-IP.
   - `req.headers["x-cluster-client-ip"]`
     > Unknown
   - `req.headers["x-appengine-user-ip"]`
     > Google App Engine app identity.
   - `req.headers["Cf-Pseudo-IPv4"]`
     > Cloudflare fallback header.

5. For each header we are going to check if its defined, if so we are going to check if it's a legit IP address, and if so we are going to check which kind of IP address it is(IPv4 or IPv6) and insert it the map.
6. After this we are going to check the followings:
   - `req.connection.remoteAddress`
   - `req.connection.socket.remoteAddress`
   - `req.socket.remoteAddress`
   - `req.info.remoteAddress`
   - `req.requestContext.identity.sourceIp`
   - `req.raw`
7. We will repeat the same steps as in 5.
8. At the end we are going to check each map
   - If the map is empty we are going to return `null`.
   - If the map has only one element we are going to return the value of the map.
   - If the map has more than one element we are going to return the value of the map that has the highest number of votes.
