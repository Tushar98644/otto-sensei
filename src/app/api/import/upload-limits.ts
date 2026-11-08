import { ANON_LIMITS, IP_LIMITS } from "@/config/plans";
import { fail } from "@/lib/api/respond";
import { clientIp, getDeviceId } from "@/lib/http";
import { log } from "@/lib/log";
import { rateLimit, retryAfterHeader, waitText, type RateLimitResult } from "@/lib/rate-limit";

// Server-only. Imports and checks need no account, so they're limited per device (a cookie) and
// per network (the IP address), each over a one-day window. These only stop a flood: the plan
// never turns an upload away (see ./ai-reads for what it does decide).

export type UploadKind = "import" | "check";

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

const DAILY_LIMITS: Record<UploadKind, { ip: number; device: number }> = {
  import: { ip: IP_LIMITS.uploadsPerDay, device: ANON_LIMITS.uploadsPerDay },
  check: { ip: IP_LIMITS.checksPerDay, device: ANON_LIMITS.checksPerDay },
};

/** Counts one upload against both limits. Returns a 429 response once either is used up. */
export async function limitUploads(req: Request, kind: UploadKind): Promise<Response | null> {
  const limits = DAILY_LIMITS[kind];
  // The network goes first: once it is over its limit, a flood without cookies stops here
  // instead of adding a fresh device row with every request.
  const network = await count(`${kind}:ip:${ipBucket(clientIp(req))}`, limits.ip, kind);
  if (network && !network.allowed) return tooMany(kind, "ip", network);
  const device = await count(`${kind}:device:${await getDeviceId()}`, limits.device, kind);
  if (device && !device.allowed) return tooMany(kind, "device", device);
  return null;
}

// Uploads don't otherwise touch the database, so an outage lets them through instead of taking
// the free features down with it.
async function count(key: string, limit: number, kind: UploadKind): Promise<RateLimitResult | null> {
  try {
    return await rateLimit(key, limit, DAY_MS);
  } catch (error) {
    // The key holds the IP address; the logger leaves query parameters out.
    log.warn(`${kind}.rate_limit_unavailable`, {}, error);
    return null;
  }
}

function tooMany(kind: UploadKind, scope: "ip" | "device", result: RateLimitResult): Response {
  log.info(`${kind}.rate_limited`, { scope });
  const did = kind === "import" ? "uploaded" : "checked";
  return fail(
    "rate_limited",
    `You've ${did} a lot of files today. Try again in ${waitLong(result.retryAfterMs)}.`,
    429,
    retryAfterHeader(result.retryAfterMs),
  );
}

// Day windows can be hours away, where "540 minutes" reads badly.
function waitLong(ms: number): string {
  if (ms < HOUR_MS) return waitText(ms);
  const hours = Math.ceil(ms / HOUR_MS);
  return hours === 1 ? "1 hour" : `${hours} hours`;
}

/**
 * The rate-limit subject for a client address. An IPv6 host usually gets a whole /64, so one
 * person can rotate through billions of addresses; the /64 prefix is what identifies them.
 * IPv4-mapped IPv6 addresses count as the IPv4 address. Anything unparseable is used as is.
 */
export function ipBucket(ip: string): string {
  const mapped = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i.exec(ip);
  if (mapped?.[1]) return mapped[1];
  if (!ip.includes(":")) return ip;
  const groups = ipv6Groups(ip);
  return groups ? `${groups.slice(0, 4).join(":")}::/64` : ip;
}

// The eight groups of an IPv6 address with "::" expanded and leading zeros dropped, so every
// spelling of one address gives the same groups. Null when it isn't an IPv6 address.
function ipv6Groups(ip: string): string[] | null {
  // A zone id ("fe80::1%eth0") names the local interface, not the address.
  const address = (ip.split("%")[0] ?? "").toLowerCase();
  const halves = address.split("::");
  if (halves.length > 2) return null;
  const split = (part: string | undefined) => (part ? part.split(":") : []);
  const head = split(halves[0]);
  const tail = split(halves[1]);
  const missing = 8 - head.length - tail.length;
  if (halves.length === 2 ? missing < 1 : missing !== 0) return null;
  const groups = [...head, ...Array.from({ length: missing }, () => "0"), ...tail];
  if (!groups.every((group) => /^[0-9a-f]{1,4}$/.test(group))) return null;
  return groups.map((group) => group.replace(/^0+(?=.)/, ""));
}
