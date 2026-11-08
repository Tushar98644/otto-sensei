import { isIPv4, isIPv6 } from "node:net";

// Server-only. Which IP addresses a fetch of a user-supplied link may connect to: public unicast
// only. Anything else could reach our own network, the platform's runtime API on loopback, or a
// cloud metadata service (169.254.169.254, fd00:ec2::254).

// Private, loopback, link-local, carrier NAT, protocol, documentation, benchmarking, multicast and
// reserved ranges.
const BLOCKED_V4: readonly (readonly [string, number])[] = [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.88.99.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
];

// Inside global unicast (2000::/3): Teredo and other protocol ranges, documentation, and 6to4,
// which can wrap any IPv4 address, private ones included.
const BLOCKED_V6: readonly (readonly [string, number])[] = [
  ["2001::", 23],
  ["2001:db8::", 32],
  ["2002::", 16],
  ["3fff::", 20],
];

// These carry an IPv4 address in their last 32 bits, which decides for them.
const MAPPED_V4: readonly (readonly [string, number])[] = [
  ["::ffff:0:0", 96],
  ["64:ff9b::", 96],
];

function v4Number(ip: string): number {
  return ip.split(".").reduce((value, part) => value * 256 + Number(part), 0);
}

function inV4(ip: number, [base, bits]: readonly [string, number]): boolean {
  const size = 2 ** (32 - bits);
  return Math.floor(ip / size) === Math.floor(v4Number(base) / size);
}

function isPublicV4(ip: string): boolean {
  const value = v4Number(ip);
  return !BLOCKED_V4.some((range) => inV4(value, range));
}

// The 8 groups of an IPv6 address, with "::" expanded and a trailing dotted IPv4 part folded into
// the last two groups. Null for anything that isn't IPv6.
export function ipv6Groups(ip: string): number[] | null {
  if (!isIPv6(ip)) return null;
  let address = ip.split("%")[0]!.toLowerCase();
  const dotted = /(\d{1,3}(?:\.\d{1,3}){3})$/.exec(address);
  if (dotted?.[1]) {
    const v4 = v4Number(dotted[1]);
    const high = Math.floor(v4 / 65536);
    address = `${address.slice(0, -dotted[1].length)}${high.toString(16)}:${(v4 % 65536).toString(16)}`;
  }
  const [head = "", tail] = address.split("::");
  const parse = (part: string) => (part ? part.split(":").map((group) => parseInt(group, 16)) : []);
  const front = parse(head);
  const back = tail === undefined ? [] : parse(tail);
  const zeros = tail === undefined ? 0 : 8 - front.length - back.length;
  const groups = [...front, ...Array.from({ length: zeros }, () => 0), ...back];
  return groups.length === 8 ? groups : null;
}

function inV6(groups: readonly number[], [base, bits]: readonly [string, number]): boolean {
  const prefix = ipv6Groups(base)!;
  for (let i = 0; i * 16 < bits; i++) {
    const shift = 16 - Math.min(16, bits - i * 16);
    if (groups[i]! >> shift !== prefix[i]! >> shift) return false;
  }
  return true;
}

function isPublicV6(ip: string): boolean {
  const groups = ipv6Groups(ip);
  if (!groups) return false;
  if (MAPPED_V4.some((range) => inV6(groups, range))) {
    const v4 = groups[6]! * 65536 + groups[7]!;
    return isPublicV4([v4 >>> 24, (v4 >>> 16) & 255, (v4 >>> 8) & 255, v4 & 255].join("."));
  }
  if (!inV6(groups, ["2000::", 3])) return false;
  return !BLOCKED_V6.some((range) => inV6(groups, range));
}

/** True only for a public unicast IPv4 or IPv6 address. Unparseable input is never public. */
export function isPublicAddress(ip: string): boolean {
  if (isIPv4(ip)) return isPublicV4(ip);
  return isPublicV6(ip);
}
