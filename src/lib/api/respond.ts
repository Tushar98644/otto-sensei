import type { ApiErrorCode } from "./types";

export function ok<T extends object>(data: T, init?: ResponseInit): Response {
  return Response.json({ ok: true, ...data }, init);
}

export function fail(
  code: ApiErrorCode,
  message: string,
  status: number,
  headers?: HeadersInit,
): Response {
  return Response.json({ ok: false, error: { code, message } }, { status, headers });
}
