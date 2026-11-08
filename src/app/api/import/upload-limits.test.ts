import { describe, expect, it } from "vitest";
import { ipBucket } from "./upload-limits";

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
