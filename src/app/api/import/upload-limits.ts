import { ANON_LIMITS, IP_LIMITS } from "@/config/plans";
import { fail } from "@/lib/api/respond";
import { clientIp, getDeviceId } from "@/lib/http";
import { log } from "@/lib/log";
import { rateLimit, retryAfterHeader, waitText, type RateLimitResult } from "@/lib/rate-limit";

// Imports and checks need no account, so they're limited per device cookie and per IP, over a
// day. These only stop a flood: the plan never turns an upload away.

export type UploadKind = "import" | "check";

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

const DAILY_LIMITS: Record<UploadKind, { ip: number; device: number }> = {
  import: { ip: IP_LIMITS.uploadsPerDay, device: ANON_LIMITS.uploadsPerDay },
  check: { ip: IP_LIMITS.checksPerDay, device: ANON_LIMITS.checksPerDay },
};

export async function limitUploads(req: Request, kind: UploadKind): Promise<Response | null> {
  const limits = DAILY_LIMITS[kind];
  // The network goes first, so a flood without cookies stops before adding a device row each time.
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

// An IPv6 host usually gets a whole /64, so the /64 prefix is what identifies one person.
// IPv4-mapped addresses count as the IPv4 address.
export function ipBucket(ip: string): string {
  const mapped = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i.exec(ip);
  if (mapped?.[1]) return mapped[1];
  if (!ip.includes(":")) return ip;
  const groups = ipv6Groups(ip);
  return groups ? `${groups.slice(0, 4).join(":")}::/64` : ip;
}

// Expanded and without leading zeros, so every spelling of one address gives the same groups.
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
