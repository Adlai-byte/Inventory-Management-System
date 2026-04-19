import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, hashPassword, verifyPassword } from "@/lib/auth";
import { execute, queryOne } from "@/lib/db";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  return NextResponse.json({ user });
}

export async function PUT(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { full_name, current_password, new_password } = body;

    // Update profile name
    if (full_name !== undefined) {
      const trimmed = String(full_name).trim();
      if (trimmed.length === 0 || trimmed.length > 255) {
        return NextResponse.json({ error: "Name must be 1-255 characters" }, { status: 400 });
      }
      await execute("UPDATE inv_users SET full_name = ? WHERE id = ?", [trimmed, user.id]);
    }

    // Change password
    if (new_password) {
      const { force_change } = body as { force_change?: boolean };

      if (new_password.length < 8) {
        return NextResponse.json({ error: "New password must be at least 8 characters" }, { status: 400 });
      }

      // Force-change path: user must have must_change_password set; skip old password check
      if (force_change) {
        const dbUser = await queryOne<{ must_change_password: number }>(
          "SELECT must_change_password FROM inv_users WHERE id = ?",
          [user.id]
        );
        if (!dbUser?.must_change_password) {
          return NextResponse.json({ error: "Force change not required" }, { status: 400 });
        }
      } else {
        // Normal path: verify current password
        if (!current_password) {
          return NextResponse.json({ error: "Current password is required" }, { status: 400 });
        }
        const row = await queryOne<{ password_hash: string }>(
          "SELECT password_hash FROM inv_users WHERE id = ?",
          [user.id]
        );
        if (!row) {
          return NextResponse.json({ error: "User not found" }, { status: 404 });
        }
        const valid = await verifyPassword(current_password, row.password_hash);
        if (!valid) {
          return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
        }
      }

      const hashed = await hashPassword(new_password);
      await execute(
        "UPDATE inv_users SET password_hash = ?, must_change_password = 0 WHERE id = ?",
        [hashed, user.id]
      );
    }

    return NextResponse.json({
      success: true,
      user: { ...user, full_name: full_name !== undefined ? String(full_name).trim() : user.full_name },
    });
  } catch (error: unknown) {
    console.error("Auth me PUT error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
