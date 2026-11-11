import type { ApiErrorCode, ApiErrorReason } from "./types";

export function ok<T extends object>(data: T, init?: ResponseInit): Response {
  return Response.json({ ok: true, ...data }, init);
}

export function fail(
  code: ApiErrorCode,
  message: string,
  status: number,
  headers?: HeadersInit,
  reason?: ApiErrorReason,
): Response {
  const error = reason ? { code, message, reason } : { code, message };
  return Response.json({ ok: false, error }, { status, headers });
}
