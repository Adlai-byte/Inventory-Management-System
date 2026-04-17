export interface SessionUser {
  id: number;
  username: string;
  full_name: string | null;
  role: "admin" | "manager" | "staff";
}

interface SessionTokenPayload extends SessionUser {
  exp: number;
  iat: number;
}

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function getSessionSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("Missing JWT_SECRET environment variable");
  }
  return secret;
}

function toBase64Url(bytes: Uint8Array): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64url");
  }
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value: string): Uint8Array {
  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(value, "base64url"));
  }
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(normalized + padding);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function sign(data: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(getSessionSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return toBase64Url(new Uint8Array(signature));
}

async function verify(data: string, signature: string): Promise<boolean> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(getSessionSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );
  const signatureBytes = fromBase64Url(signature);
  const signatureBuffer = new ArrayBuffer(signatureBytes.byteLength);
  new Uint8Array(signatureBuffer).set(signatureBytes);
  return crypto.subtle.verify("HMAC", key, signatureBuffer, enc.encode(data));
}

export async function createSessionToken(user: SessionUser): Promise<string> {
  const payload: SessionTokenPayload = {
    ...user,
    iat: Date.now(),
    exp: Date.now() + SESSION_TTL_MS,
  };
  const json = JSON.stringify(payload);
  const payloadEncoded = toBase64Url(new TextEncoder().encode(json));
  const signature = await sign(payloadEncoded);
  return `${payloadEncoded}.${signature}`;
}

export async function parseSessionToken(token: string): Promise<SessionUser | null> {
  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const [payloadEncoded, signature] = parts;
  const valid = await verify(payloadEncoded, signature);
  if (!valid) return null;

  try {
    const json = new TextDecoder().decode(fromBase64Url(payloadEncoded));
    const payload = JSON.parse(json) as SessionTokenPayload;

    if (payload.exp < Date.now()) return null;
    if (!payload.id || !payload.username || !payload.role) return null;

    return {
      id: payload.id,
      username: payload.username,
      full_name: payload.full_name ?? null,
      role: payload.role,
    };
  } catch {
    return null;
  }
}

export const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;
