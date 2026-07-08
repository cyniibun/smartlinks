import { NextResponse } from "next/server";

type LogContext = Record<string, unknown>;

function toSafeLogValue(value: unknown) {
  if (value instanceof Error) {
    return { name: value.name, message: value.message };
  }
  return value;
}

export function logApiError(scope: string, error: unknown, context: LogContext = {}) {
  console.error(`[tone-link:${scope}]`, {
    ...context,
    error: toSafeLogValue(error),
  });
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function genericApiError(scope: string, error: unknown, context: LogContext = {}, status = 400, message = "Unable to complete request.") {
  logApiError(scope, error, context);
  return jsonError(message, status);
}
