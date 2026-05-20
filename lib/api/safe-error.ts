import { NextResponse } from "next/server";

const GENERIC_SERVER_ERROR = "Something went wrong. Please try again.";

/** Reject open redirects — only same-origin relative paths are allowed. */
export function safeRedirectPath(next: string | null, fallback = "/dashboard"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return fallback;
  }
  if (next.includes("\\") || next.includes("\0")) {
    return fallback;
  }
  return next;
}

export function logRouteError(
  route: string,
  errorCode: string,
  error: unknown,
  extra?: Record<string, unknown>,
): void {
  const message = error instanceof Error ? error.message : String(error);
  console.error(JSON.stringify({ route, errorCode, message, ...extra }));
}

/** Log internal details server-side; return a safe message to clients. */
export function serverErrorResponse(
  route: string,
  errorCode: string,
  error: unknown,
  extra?: Record<string, unknown>,
): NextResponse {
  logRouteError(route, errorCode, error, extra);
  return NextResponse.json({ error: GENERIC_SERVER_ERROR }, { status: 500 });
}
