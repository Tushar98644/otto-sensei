import { createHash, timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";
import { log } from "@/lib/log";

export const MIN_CRON_SECRET_LENGTH = 16;

let warnedMissing = false;

export function cronSecret(): string | null {
  const secret = env().CRON_SECRET ?? "";
  if (secret.length >= MIN_CRON_SECRET_LENGTH) return secret;
  if (!warnedMissing) {
    warnedMissing = true;
    log.warn("cron.secret_missing", { minLength: MIN_CRON_SECRET_LENGTH });
  }
  return null;
}

// Hashing both sides makes them equal length, so the compare leaks neither secret nor length.
function digest(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

export function isAuthorizedCron(req: Request): boolean {
  const secret = cronSecret();
  if (!secret) return false;
  const header = req.headers.get("authorization") ?? "";
  if (!header.startsWith("Bearer ")) return false;
  return timingSafeEqual(digest(header.slice("Bearer ".length)), digest(secret));
}
