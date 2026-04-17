import { NextResponse, type NextRequest } from "next/server";
import { execute, simpleQuery, type SqlValue } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { Profile } from "@/lib/types";
import { requireAuth } from "@/lib/route-auth";
import { createUserSchema } from "@/lib/validations/user";

export async function GET(request: NextRequest) {
  const user = await requireAuth(["admin"]);
  if (user instanceof NextResponse) return user;

  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.max(1, parseInt(searchParams.get("limit") || "25"));
    const search = searchParams.get("search") || "";
    
    const offset = (page - 1) * limit;
    
    const whereClause = "WHERE (username LIKE ? OR full_name LIKE ? OR email LIKE ?)";
    const params: SqlValue[] = [`%${search}%`, `%${search}%`, `%${search}%`];

    const countResult = await simpleQuery<{ total: number }>(
      `SELECT COUNT(*) as total FROM inv_users ${whereClause}`,
      params
    );
    const total = countResult[0]?.total || 0;

    const users = await simpleQuery<Profile>(
      `SELECT id, username, full_name, avatar_url, email, role, created_at 
       FROM inv_users 
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return NextResponse.json({ 
      data: users,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error: unknown) {
    console.error("Users API GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const adminUser = await requireAuth(["admin"]);
  if (adminUser instanceof NextResponse) return adminUser;

  try {
    const body = await request.json();
    
    // Use Zod validation
    const parsed = createUserSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return NextResponse.json({ error: firstError?.message || "Validation error" }, { status: 400 });
    }

    const { username, email, password, full_name, role } = parsed.data;
    const password_hash = await hashPassword(password);

    const result = await execute(
      "INSERT INTO inv_users (username, email, password_hash, full_name, role) VALUES (?, ?, ?, ?, ?)",
      [username, email || null, password_hash, full_name, role]
    );

    return NextResponse.json({ 
      data: { id: result.insertId, username, email: email || null, full_name, role },
      message: "User created successfully" 
    });
  } catch (error: unknown) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: string }).code === "ER_DUP_ENTRY"
    ) {
      return NextResponse.json({ error: "Username or email already exists" }, { status: 400 });
    }
    console.error("Users API POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
