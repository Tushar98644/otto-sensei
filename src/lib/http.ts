import { cookies } from "next/headers";
import type { z } from "zod";
import { isProduction } from "@/lib/env";

const MAX_JSON_BYTES = 512 * 1024;
const DEVICE_COOKIE = "otto_did";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Vercel overwrites x-forwarded-for with the real client IP, so its first entry is trustworthy.
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

// For per-device limits. Only in route handlers and server actions, where cookies can be set.
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

export type BodyRead =
  { ok: true; bytes: Uint8Array<ArrayBuffer> } | { ok: false; reason: "too_large" | "unreadable" };

// Off Vercel nothing caps a body and chunked uploads declare no length, so stop reading early.
export async function readBody(req: Request, maxBytes: number): Promise<BodyRead> {
  if (!req.body) return { ok: true, bytes: new Uint8Array(0) };
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel().catch(() => undefined);
        return { ok: false, reason: "too_large" };
      }
      chunks.push(value);
    }
  } catch {
    return { ok: false, reason: "unreadable" };
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { ok: true, bytes };
}
