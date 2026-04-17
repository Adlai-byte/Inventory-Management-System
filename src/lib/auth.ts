import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { queryOne } from "./db";
import {
  createSessionToken,
  parseSessionToken,
  SESSION_MAX_AGE_SECONDS,
  type SessionUser,
} from "./session-token";
export type { SessionUser } from "./session-token";

const SESSION_COOKIE = "inv_session";

function shouldUseSecureCookie(): boolean {
  return process.env.SESSION_COOKIE_SECURE === "true";
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSession(user: SessionUser): Promise<string> {
  const token = await createSessionToken(user);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: shouldUseSecureCookie(),
    sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  return token;
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return parseSessionToken(token);
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

// Get full user from session (with latest DB data)
export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await getSession();
  if (!session) return null;

  const user = await queryOne<SessionUser>(
    "SELECT id, username, full_name, role FROM inv_users WHERE id = ?",
    [session.id]
  );
  if (!user) return null;

  return {
    id: user.id,
    username: user.username,
    full_name: user.full_name,
    role: user.role,
  };
}

// Helper to validate session from a raw cookie value (for middleware)
export async function validateSessionToken(token: string): Promise<SessionUser | null> {
  return parseSessionToken(token);
}
