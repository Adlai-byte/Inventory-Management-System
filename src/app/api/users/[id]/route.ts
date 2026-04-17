import { NextResponse, type NextRequest } from "next/server";
import { execute } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { requireAuth } from "@/lib/route-auth";
import { updateUserSchema } from "@/lib/validations/user";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminUser = await requireAuth(["admin"]);
  if (adminUser instanceof NextResponse) return adminUser;

  try {
    const { id } = await params;
    const body = await request.json();

    // Use Zod validation
    const parsed = updateUserSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return NextResponse.json({ error: firstError?.message || "Validation error" }, { status: 400 });
    }

    const { username, password, full_name, email, role } = parsed.data;

    // Build dynamic update query
    const updates: string[] = [];
    const values: (string | number | null)[] = [];

    if (username) {
      updates.push("username = ?");
      values.push(username);
    }
    if (password && password.trim() !== "") {
      updates.push("password_hash = ?");
      values.push(await hashPassword(password));
    }
    if (full_name) {
      updates.push("full_name = ?");
      values.push(full_name);
    }
    if (email !== undefined) {
      updates.push("email = ?");
      values.push(email || null);
    }
    if (role) {
      updates.push("role = ?");
      values.push(role);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    values.push(parseInt(id));
    await execute(
      `UPDATE inv_users SET ${updates.join(", ")} WHERE id = ?`,
      values
    );

    return NextResponse.json({ message: "User updated successfully" });
  } catch (error: unknown) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: string }).code === "ER_DUP_ENTRY"
    ) {
      return NextResponse.json({ error: "Username or email already exists" }, { status: 400 });
    }
    console.error("User update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminUser = await requireAuth(["admin"]);
  if (adminUser instanceof NextResponse) return adminUser;

  const { id } = await params;

  // Prevent admin from deleting themselves
  if (parseInt(id) === adminUser.id) {
    return NextResponse.json({ error: "Cannot delete yourself" }, { status: 400 });
  }

  try {
    await execute("DELETE FROM inv_users WHERE id = ?", [parseInt(id)]);
    return NextResponse.json({ message: "User deleted successfully" });
  } catch (error: unknown) {
    console.error("User delete error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
