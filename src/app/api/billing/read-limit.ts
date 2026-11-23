import { fail } from "@/lib/api/respond";
import { rateLimit, retryAfterHeader, waitText } from "@/lib/rate-limit";
import { HOUR_MS } from "@/lib/time";

// Reads get their own buckets, so looking at the account page never uses up the billing links.
export const READ_LIMITS = { history: 60, credit: 60, invoice: 30, export: 5 } as const;

export async function limitReads(
  kind: keyof typeof READ_LIMITS,
  userId: string,
): Promise<Response | null> {
  const result = await rateLimit(`${kind}:user:${userId}`, READ_LIMITS[kind], HOUR_MS);
  if (result.allowed) return null;
  return fail(
    "rate_limited",
    `Too many tries. Try again in ${waitText(result.retryAfterMs)}.`,
    429,
    retryAfterHeader(result.retryAfterMs),
  );
}
