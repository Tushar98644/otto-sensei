import { fail } from "@/lib/api/respond";
import { clientIp, getDeviceId } from "@/lib/http";
import { log } from "@/lib/log";
import { rateLimit, retryAfterHeader, waitText, type RateLimitResult } from "@/lib/rate-limit";
import { HOUR_MS } from "@/lib/time";

export type LimitScope = "ip" | "device";
export type LimitHit = { scope: LimitScope; result: RateLimitResult };

export type NetworkDeviceLimit = {
  // Counted under "<key>:ip:<network>" and "<key>:device:<id>".
  key: string;
  // Log events are "<logAs>.rate_limit_unavailable".
  logAs: string;
  ip: number;
  device: number;
  windowMs: number;
};

// Network first, so a flood without cookies stops before adding a device row per request.
export async function limitNetworkThenDevice(
  req: Request,
  limits: NetworkDeviceLimit,
): Promise<LimitHit | null> {
  const { key, logAs, windowMs } = limits;
  const network = await count(`${key}:ip:${ipBucket(clientIp(req))}`, limits.ip, windowMs, logAs);
  if (network && !network.allowed) return { scope: "ip", result: network };
  const device = await count(
    `${key}:device:${await getDeviceId()}`,
    limits.device,
    windowMs,
    logAs,
  );
  if (device && !device.allowed) return { scope: "device", result: device };
  return null;
}

// A database outage lets requests through instead of taking the feature down with it.
async function count(
  key: string,
  limit: number,
  windowMs: number,
  logAs: string,
): Promise<RateLimitResult | null> {
  try {
    return await rateLimit(key, limit, windowMs);
  } catch (error) {
    // The key holds the IP address, so only the error goes to the log.
    log.warn(`${logAs}.rate_limit_unavailable`, {}, error);
    return null;
  }
}

// Per account, for saves that happen as someone types: the limit only stops a script.
export async function limitHourlyWrites(
  key: string,
  perHour: number,
  what: string,
): Promise<Response | null> {
  const limit = await rateLimit(key, perHour, HOUR_MS);
  if (limit.allowed) return null;
  return fail(
    "rate_limited",
    `That's a lot of ${what} in one hour. Try again in ${waitText(limit.retryAfterMs)}.`,
    429,
    retryAfterHeader(limit.retryAfterMs),
  );
}

// An IPv6 host usually gets a whole /64, so that prefix identifies one person.
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
