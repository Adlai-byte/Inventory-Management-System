import { NextRequest, NextResponse } from "next/server";
import { queryOne } from "@/lib/db";
import { verifyPassword, createSession } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

interface LoginUserRow {
  id: number;
  username: string;
  password_hash: string;
  full_name: string | null;
  role: "admin" | "manager" | "staff";
  must_change_password: number;
}

export async function POST(request: NextRequest) {
  const { success } = rateLimit(request, { limit: 5, window: 300 });
  if (!success) {
    return NextResponse.json({ error: "Too many login attempts. Please try again later." }, { status: 429 });
  }

  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ error: "Username and password are required" }, { status: 400 });
    }

    const sanitizedUsername = username.trim().toLowerCase();

    const user = await queryOne<LoginUserRow>(
      "SELECT id, username, password_hash, full_name, role, must_change_password FROM inv_users WHERE LOWER(username) = ?",
      [sanitizedUsername]
    );

    if (!user) {
      return NextResponse.json({ error: "Invalid username or password" }, { status: 401 });
    }

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      return NextResponse.json({ error: "Invalid username or password" }, { status: 401 });
    }

    await createSession({
      id: user.id,
      username: user.username,
      full_name: user.full_name,
      role: user.role,
    });

    return NextResponse.json({
      user: { id: user.id, username: user.username, full_name: user.full_name, role: user.role },
      must_change_password: !!user.must_change_password,
    });
  } catch (error: unknown) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
