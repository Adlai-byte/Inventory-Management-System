import { NextResponse } from "next/server";

/**
 * Wraps an API route handler with automatic error handling.
 * Catches unhandled exceptions and returns a consistent error response.
 *
 * Usage:
 *   export async function GET(request: NextRequest) {
 *     return withErrorHandler(async () => {
 *       // your code here
 *     });
 *   }
 */
export async function withErrorHandler(
  handler: () => Promise<NextResponse> | NextResponse
): Promise<NextResponse> {
  try {
    return await handler();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    const stack = process.env.NODE_ENV === "development" && error instanceof Error
      ? error.stack
      : undefined;

    // Log the full error server-side
    console.error("API Error:", {
      message,
      stack,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(
      { error: process.env.NODE_ENV === "production" ? "Internal server error" : message, stack },
      { status: 500 }
    );
  }
}

/**
 * Create a standardized API error response.
 */
export function apiError(message: string, status = 400, details?: Record<string, unknown>) {
  return NextResponse.json(
    { error: message, ...(details && { details }) },
    { status }
  );
}

/**
 * Create a standardized API success response.
 */
export function apiSuccess<T>(data: T, message?: string) {
  return NextResponse.json({
    message,
    data,
  });
}
