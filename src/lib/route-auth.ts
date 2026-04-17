import { NextResponse } from "next/server";
import { getSessionUser, type SessionUser } from "@/lib/auth";

type Role = SessionUser["role"];

function unauthorizedResponse() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function forbiddenResponse() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export async function requireAuth(allowedRoles?: Role[]): Promise<SessionUser | NextResponse> {
  const user = await getSessionUser();
  if (!user) return unauthorizedResponse();
  if (allowedRoles && !allowedRoles.includes(user.role)) return forbiddenResponse();
  return user;
}
