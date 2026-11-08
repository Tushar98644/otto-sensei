import { cookies } from "next/headers";
import type { z } from "zod";
import { isProduction } from "@/lib/env";

// Server-only request helpers for route handlers.

const MAX_JSON_BYTES = 512 * 1024;
const DEVICE_COOKIE = "otto_did";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Vercel overwrites x-forwarded-for with the real client address, so the first entry is trustworthy there.
export function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim() || "unknown";
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

export type ReadJsonResult<T> = { ok: true; data: T } | { ok: false; message: string };

export async function readJson<S extends z.ZodType>(
  req: Request,
  schema: S,
): Promise<ReadJsonResult<z.output<S>>> {
  const length = Number(req.headers.get("content-length") ?? "0");
  if (length > MAX_JSON_BYTES) return { ok: false, message: "Request is too large." };
  let raw: string;
  try {
    raw = await req.text();
  } catch {
    return { ok: false, message: "Couldn't read the request." };
  }
  if (raw.length > MAX_JSON_BYTES) return { ok: false, message: "Request is too large." };
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return { ok: false, message: "Request body must be JSON." };
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    const where = first?.path.length ? `${first.path.join(".")}: ` : "";
    return { ok: false, message: `${where}${first?.message ?? "Invalid request."}` };
  }
  return { ok: true, data: parsed.data };
}

// Anonymous device id for per-device limits on imports and checks. Only usable in route handlers
// and server actions, where cookies can be set.
export async function getDeviceId(): Promise<string> {
  const store = await cookies();
  const existing = store.get(DEVICE_COOKIE)?.value;
  if (existing && UUID.test(existing)) return existing;
  const id = crypto.randomUUID();
  store.set(DEVICE_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction(),
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return id;
}
