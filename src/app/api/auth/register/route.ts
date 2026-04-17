import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Registration is disabled. Please contact an administrator to create an account." },
    { status: 410 }
  );
}
