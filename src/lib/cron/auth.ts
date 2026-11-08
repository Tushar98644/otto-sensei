import { createHash, timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";
import { log } from "@/lib/log";

// Server-only. Vercel Cron calls each job with "Authorization: Bearer <CRON_SECRET>" when the
// project has that variable; anything else (a GitHub Action, curl) must send the same header.

export const MIN_CRON_SECRET_LENGTH = 16;

let warnedMissing = false;

/** The configured secret, or null when it's missing or too short to be worth checking. */
export function cronSecret(): string | null {
  const secret = env().CRON_SECRET ?? "";
  if (secret.length >= MIN_CRON_SECRET_LENGTH) return secret;
  if (!warnedMissing) {
    warnedMissing = true;
    log.warn("cron.secret_missing", { minLength: MIN_CRON_SECRET_LENGTH });
  }
  return null;
}

// Hashing both sides first makes them the same length, so the compare leaks neither the secret
// nor its length.
function digest(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

/** True only when a secret is configured and the request carries exactly it. */
export function isAuthorizedCron(req: Request): boolean {
  const secret = cronSecret();
  if (!secret) return false;
  const header = req.headers.get("authorization") ?? "";
  if (!header.startsWith("Bearer ")) return false;
  return timingSafeEqual(digest(header.slice("Bearer ".length)), digest(secret));
}
