import { describe, expect, it } from "vitest";
import { ipv6Groups, isPublicAddress } from "./address";

describe("isPublicAddress", () => {
  it.each([
    "127.0.0.1",
    "127.255.255.254",
    "10.0.0.1",
    "172.16.0.1",
    "172.31.255.255",
    "192.168.1.1",
    "169.254.169.254",
    "100.64.0.1",
    "0.0.0.0",
    "192.0.2.10",
    "198.18.0.1",
    "224.0.0.1",
    "255.255.255.255",
  ])("blocks IPv4 %s", (ip) => {
    expect(isPublicAddress(ip)).toBe(false);
  });

  it.each(["8.8.8.8", "1.1.1.1", "93.184.216.34", "172.32.0.1", "100.128.0.1", "11.0.0.1"])(
    "allows public IPv4 %s",
    (ip) => {
      expect(isPublicAddress(ip)).toBe(true);
    },
  );

  it.each([
    "::1",
    "::",
    "fe80::1",
    "fe80::1%eth0",
    "fc00::1",
    "fd00:ec2::254",
    "ff02::1",
    "100::1",
    "2001:db8::1",
    "2001::1",
    "2002:7f00:1::1",
    "::127.0.0.1",
    "::ffff:127.0.0.1",
    "::ffff:7f00:1",
    "::ffff:10.0.0.1",
    "::ffff:169.254.169.254",
    "64:ff9b::a9fe:a9fe",
  ])("blocks IPv6 %s", (ip) => {
    expect(isPublicAddress(ip)).toBe(false);
  });

  it.each([
    "2606:4700:4700::1111",
    "2a00:1450:4001:80b::200e",
    "::ffff:8.8.8.8",
    "64:ff9b::808:808",
  ])("allows public IPv6 %s", (ip) => {
    expect(isPublicAddress(ip)).toBe(true);
  });

  it.each(["", "localhost", "999.1.1.1", "1.2.3", "not-an-ip"])("never calls %j public", (ip) => {
    expect(isPublicAddress(ip)).toBe(false);
  });
});

describe("ipv6Groups", () => {
  it("expands :: and folds a dotted IPv4 tail", () => {
    expect(ipv6Groups("::ffff:127.0.0.1")).toEqual([0, 0, 0, 0, 0, 0xffff, 0x7f00, 1]);
    expect(ipv6Groups("2001:db8::8:1")).toEqual([0x2001, 0xdb8, 0, 0, 0, 0, 8, 1]);
    expect(ipv6Groups("1.2.3.4")).toBeNull();
  });
});
