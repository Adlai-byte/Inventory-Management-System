#!/usr/bin/env node
/**
 * HTTPS proxy for Next.js dev server
 * Runs Next.js on port 3001 (localhost only), then proxies HTTPS on port 3000 (0.0.0.0)
 * This ensures mobile/LAN devices can access via HTTPS with camera support.
 */

const https = require("https");
const http = require("http");
const fs = require("fs");
const path = require("path");

const HTTPS_PORT = 3010;
const NEXT_PORT = 3001;
const BIND = "0.0.0.0";

const keyPath = path.join(__dirname, "certs", "key.pem");
const certPath = path.join(__dirname, "certs", "cert.pem");

if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
  console.error("Certificates not found. Run: scripts\\server-init.bat  (or: mkcert -key-file certs/key.pem -cert-file certs/cert.pem localhost 127.0.0.1 YOUR-LAN-IP)");
  process.exit(1);
}

const options = {
  key: fs.readFileSync(keyPath),
  cert: fs.readFileSync(certPath),
};

const server = https.createServer(options, (req, res) => {
  // Forward to Next.js on localhost:3001
  const proxyReq = http.request(
    {
      hostname: "localhost",
      port: NEXT_PORT,
      path: req.url,
      method: req.method,
      headers: { ...req.headers, host: req.headers.host || `localhost:${HTTPS_PORT}` },
    },
    (proxyRes) => {
      // Handle redirects - rewrite Location headers from localhost:3001 to the original host
      const headers = { ...proxyRes.headers };
      if (headers.location && headers.location.includes(`localhost:${NEXT_PORT}`)) {
        headers.location = headers.location.replace(`localhost:${NEXT_PORT}`, req.headers.host || `localhost:${HTTPS_PORT}`);
      }
      res.writeHead(proxyRes.statusCode, headers);
      proxyRes.pipe(res, { end: true });
    }
  );

  proxyReq.on("error", (err) => {
    console.error("Proxy error:", err.message);
    if (!res.headersSent) {
      res.writeHead(502, { "Content-Type": "text/plain" });
    }
    res.end("Bad Gateway: Next.js server not responding");
  });

  req.pipe(proxyReq, { end: true });
});

server.listen(HTTPS_PORT, BIND, () => {
  console.log(`\n  🔒 HTTPS Proxy running on https://${BIND}:${HTTPS_PORT}`);
  console.log(`  ↳ Forwarding to Next.js at http://localhost:${NEXT_PORT}`);
  console.log(`\n  📱 Access from phone: https://192.168.0.101:${HTTPS_PORT}`);
  console.log(`  ⚠️  Accept the self-signed certificate warning on your phone\n`);
});
