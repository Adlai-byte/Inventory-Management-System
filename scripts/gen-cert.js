#!/usr/bin/env node
/**
 * Generates a local CA + server certificate chain for LAN HTTPS.
 *
 * Why two certs:
 *   - ca.pem   → install once on your phone as a trusted root CA
 *   - cert.pem → server cert signed by that CA; trusted automatically
 *
 * Once the phone trusts the CA, HTTPS works on LAN without any tunnel.
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");

// ── Auto-detect LAN IPs ────────────────────────────────────────────────────
const lanIPs = [];
for (const ifaces of Object.values(os.networkInterfaces())) {
  for (const iface of ifaces) {
    if (iface.family === "IPv4" && !iface.internal) lanIPs.push(iface.address);
  }
}
if (lanIPs.length === 0) {
  console.error("No LAN IP detected. Connect to a network first.");
  process.exit(1);
}
console.log(`Detected LAN IPs: ${lanIPs.join(", ")}`);

// ── Paths ──────────────────────────────────────────────────────────────────
const root = path.join(__dirname, "..");
const certsDir = path.join(root, "certs");
const publicDir = path.join(root, "public");
if (!fs.existsSync(certsDir)) fs.mkdirSync(certsDir, { recursive: true });

const P = (f) => path.join(certsDir, f);

// ── SAN list (all detected IPs + localhost) ────────────────────────────────
const sanLines = ["DNS.1 = localhost", "IP.1 = 127.0.0.1"];
lanIPs.forEach((ip, i) => sanLines.push(`IP.${i + 2} = ${ip}`));
const sanBlock = sanLines.join("\n");

// ── Config files ───────────────────────────────────────────────────────────
fs.writeFileSync(
  P("ca.cnf"),
  `[req]
default_md = sha256
prompt = no
distinguished_name = dn
x509_extensions = ca_ext

[dn]
CN = BATISTIL Local CA
O  = BATISTIL Mini Mart
C  = PH

[ca_ext]
basicConstraints = critical, CA:TRUE, pathlen:0
keyUsage         = critical, digitalSignature, keyCertSign, cRLSign
subjectKeyIdentifier = hash`
);

fs.writeFileSync(
  P("server.cnf"),
  `[req]
default_md = sha256
prompt = no
distinguished_name = dn

[dn]
CN = BATISTIL Inventory Server`
);

fs.writeFileSync(
  P("ext.cnf"),
  `basicConstraints     = CA:FALSE
keyUsage             = digitalSignature, keyEncipherment
extendedKeyUsage     = serverAuth
subjectAltName       = @alt_names

[alt_names]
${sanBlock}`
);

// ── Generate ───────────────────────────────────────────────────────────────
try {
  console.log("\n[1/3] Generating CA key + certificate (valid 10 years)...");
  execSync(
    `openssl req -x509 -newkey rsa:2048 -keyout "${P("ca.key")}" -out "${P("ca.pem")}" -days 3650 -nodes -config "${P("ca.cnf")}"`,
    { stdio: "inherit" }
  );

  console.log("\n[2/3] Generating server key + CSR...");
  execSync(
    `openssl req -newkey rsa:2048 -keyout "${P("key.pem")}" -out "${P("server.csr")}" -nodes -config "${P("server.cnf")}"`,
    { stdio: "inherit" }
  );

  console.log("\n[3/3] Signing server cert with local CA (valid 2 years)...");
  execSync(
    `openssl x509 -req -in "${P("server.csr")}" -CA "${P("ca.pem")}" -CAkey "${P("ca.key")}" -CAcreateserial -out "${P("cert.pem")}" -days 730 -sha256 -extfile "${P("ext.cnf")}"`,
    { stdio: "inherit" }
  );

  // Clean up temp files
  fs.unlinkSync(P("server.csr"));

  // Copy CA cert to public/ so the phone can download it over HTTP
  fs.copyFileSync(P("ca.pem"), path.join(publicDir, "ca.pem"));

  const primaryIP = lanIPs[0];

  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  CERTIFICATES GENERATED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  certs/ca.pem   ← install this on your phone (once)
  certs/key.pem  ← server private key
  certs/cert.pem ← server cert (signed by CA)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  SETUP (do this once per phone)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Step 1 — start HTTP server on PC:
    npm run dev:lan

  Step 2 — on your phone, open this URL:
    http://${primaryIP}:3010/ca.pem
${lanIPs.length > 1 ? `  (other IPs: ${lanIPs.slice(1).map((ip) => `http://${ip}:3010/ca.pem`).join(", ")})\n` : ""}
  Step 3 — install the certificate:

    iPhone / iPad:
      Tap "Allow" when Safari asks to download.
      → Settings → General → VPN & Device Management
      → "BATISTIL Local CA" → Install → enter passcode → Install
      → Settings → General → About → Certificate Trust Settings
      → toggle ON "BATISTIL Local CA" → Continue

    Android:
      Tap the downloaded file.
      → enter your PIN/password when prompted
      → name it "BATISTIL CA", type = "CA certificate"

  Step 4 — stop HTTP server, start HTTPS:
    npm run dev:lan:https

  Step 5 — on your phone, open:
    https://${primaryIP}:3010

  The scanner will work with full camera access, no tunnel needed.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
} catch {
  console.error("\nFailed. Make sure OpenSSL is in your PATH.");
  console.error(
    "Windows: Git for Windows includes OpenSSL, or install from https://slproweb.com/products/Win32OpenSSL.html"
  );
  process.exit(1);
}
