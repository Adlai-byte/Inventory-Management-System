import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { execute } from "@/lib/db";

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
    const { full_name } = await request.json();
    await execute("UPDATE inv_users SET full_name = ? WHERE id = ?", [full_name, user.id]);
    return NextResponse.json({ success: true, user: { ...user, full_name } });
  } catch (error: unknown) {
    console.error("Auth me PUT error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
