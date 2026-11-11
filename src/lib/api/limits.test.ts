import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cookieJar, jsonRequest, resetDb } from "@/lib/auth/test-helpers";
import { HOUR_MS } from "@/lib/time";
import {
  ipBucket,
  limitHourlyWrites,
  limitNetworkThenDevice,
  type NetworkDeviceLimit,
} from "./limits";

vi.mock("next/headers", async () => (await import("@/lib/auth/test-helpers")).nextHeadersMock);

const outage = vi.hoisted(() => ({ on: false }));
vi.mock("@/lib/rate-limit", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/rate-limit")>();
  return {
    ...actual,
    rateLimit: (...args: Parameters<typeof actual.rateLimit>) =>
      outage.on ? Promise.reject(new Error("database down")) : actual.rateLimit(...args),
  };
});

// Mid-window, so no test straddles a window boundary.
const NOW = Date.UTC(2026, 10, 7, 12, 30, 0) + 7;
const LIMITS: NetworkDeviceLimit = {
  key: "test",
  logAs: "test",
  ip: 3,
  device: 2,
  windowMs: HOUR_MS,
};

const request = (ip = "203.0.113.7") => jsonRequest("/api/test", {}, { ip });

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
  outage.on = false;
  await resetDb();
  cookieJar.clear();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("limitNetworkThenDevice", () => {
  it("lets a device through up to its limit, then names the device", async () => {
    expect(await limitNetworkThenDevice(request(), LIMITS)).toBeNull();
    expect(await limitNetworkThenDevice(request(), LIMITS)).toBeNull();
    const hit = await limitNetworkThenDevice(request(), LIMITS);
    expect(hit?.scope).toBe("device");
    expect(hit?.result).toMatchObject({ allowed: false, remaining: 0 });
    expect(hit?.result.retryAfterMs).toBe(HOUR_MS - (NOW % HOUR_MS));
  });

  it("counts every device on one network together, and checks the network first", async () => {
    for (let i = 0; i < 3; i++) {
      cookieJar.clear();
      expect(await limitNetworkThenDevice(request(), LIMITS)).toBeNull();
    }
    cookieJar.clear();
    expect((await limitNetworkThenDevice(request(), LIMITS))?.scope).toBe("ip");
    // Stopped before the device count, so no device cookie was handed out.
    expect(cookieJar.getAll()).toEqual([]);
    expect(await limitNetworkThenDevice(request("198.51.100.1"), LIMITS)).toBeNull();
  });

  it("counts an IPv6 network by its /64", async () => {
    for (let i = 1; i <= 3; i++) {
      cookieJar.clear();
      await limitNetworkThenDevice(request(`2001:db8:abcd:12::${i}`), LIMITS);
    }
    cookieJar.clear();
    expect((await limitNetworkThenDevice(request("2001:db8:abcd:12::99"), LIMITS))?.scope).toBe(
      "ip",
    );
  });

  it("lets requests through when the database is down", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    outage.on = true;
    for (let i = 0; i < 5; i++) expect(await limitNetworkThenDevice(request(), LIMITS)).toBeNull();
    expect(warn).toHaveBeenCalled();
    expect(JSON.stringify(warn.mock.calls)).toContain("test.rate_limit_unavailable");
    expect(JSON.stringify(warn.mock.calls)).not.toContain("203.0.113.7");
  });
});

describe("limitHourlyWrites", () => {
  it("allows the hour's writes, then answers 429 with a wait", async () => {
    for (let i = 0; i < 2; i++)
      expect(await limitHourlyWrites("test:write:a", 2, "changes")).toBeNull();
    const res = await limitHourlyWrites("test:write:a", 2, "changes");
    expect(res?.status).toBe(429);
    expect(res?.headers.get("Retry-After")).toBe(
      String(Math.ceil((HOUR_MS - (NOW % HOUR_MS)) / 1000)),
    );
    expect(await res?.json()).toEqual({
      ok: false,
      error: {
        code: "rate_limited",
        message: "That's a lot of changes in one hour. Try again in 30 minutes.",
      },
    });
    expect(await limitHourlyWrites("test:write:b", 2, "changes")).toBeNull();
  });
});

describe("ipBucket", () => {
  it("keeps IPv4 addresses as they are", () => {
    expect(ipBucket("203.0.113.7")).toBe("203.0.113.7");
    expect(ipBucket("::ffff:203.0.113.7")).toBe("203.0.113.7");
  });

  it("groups IPv6 addresses by their /64 prefix, however they're written", () => {
    expect(ipBucket("2001:db8:abcd:12:1:2:3:4")).toBe("2001:db8:abcd:12::/64");
    expect(ipBucket("2001:db8:abcd:12::99")).toBe("2001:db8:abcd:12::/64");
    expect(ipBucket("2001:0DB8:ABCD:0012:ffff::1")).toBe("2001:db8:abcd:12::/64");
    expect(ipBucket("2001:db8::1")).toBe("2001:db8:0:0::/64");
    expect(ipBucket("::1")).toBe("0:0:0:0::/64");
    expect(ipBucket("fe80::1%eth0")).toBe("fe80:0:0:0::/64");
  });

  it("uses anything else unchanged", () => {
    expect(ipBucket("unknown")).toBe("unknown");
    expect(ipBucket("1:2:3")).toBe("1:2:3");
    expect(ipBucket("1::2::3")).toBe("1::2::3");
    expect(ipBucket("1:2:3:4:5:6:7:8::")).toBe("1:2:3:4:5:6:7:8::");
    expect(ipBucket("2001:db8::zz")).toBe("2001:db8::zz");
  });
});
