import { NextResponse } from "next/server";
import pool from "@/lib/db";

const startTime = Date.now();

export async function GET() {
  const health: {
    status: "healthy" | "unhealthy";
    timestamp: string;
    uptime_seconds: number;
    version: string;
    checks: {
      database: { status: string; latency_ms?: number; error?: string };
    };
  } = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime_seconds: Math.floor((Date.now() - startTime) / 1000),
    version: process.env.npm_package_version ?? "0.1.0",
    checks: {
      database: { status: "unknown" },
    },
  };

  const dbStart = Date.now();
  try {
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    health.checks.database = {
      status: "connected",
      latency_ms: Date.now() - dbStart,
    };
  } catch (error) {
    health.status = "unhealthy";
    health.checks.database = {
      status: "disconnected",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }

  return NextResponse.json(health, {
    status: health.status === "healthy" ? 200 : 503,
  });
}