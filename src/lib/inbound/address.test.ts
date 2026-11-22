import { describe, expect, it } from "vitest";
import { addressOf, handleOfRecipient } from "./address";

const SUB = { style: "subaddress", domain: "track.ottosensei.com" } as const;
const SHORT = { style: "domain", domain: "otto.jobs" } as const;

describe("addresses", () => {
  it("put the handle after otto+ on the tracking subdomain", () => {
    expect(addressOf("priya.sharma", SUB)).toBe("otto+priya.sharma@track.ottosensei.com");
    expect(handleOfRecipient("<OTTO+Priya.Sharma@track.ottosensei.com>", SUB)).toBe("priya.sharma");
    expect(handleOfRecipient("priya.sharma@track.ottosensei.com", SUB)).toBeNull();
    expect(handleOfRecipient("otto+priya@ottosensei.com", SUB)).toBeNull();
    expect(handleOfRecipient("otto+bad_handle@track.ottosensei.com", SUB)).toBeNull();
  });

  it("can use a short domain of its own, and still reads the subaddress form", () => {
    expect(addressOf("priya", SHORT)).toBe("priya@otto.jobs");
    expect(handleOfRecipient("priya@otto.jobs", SHORT)).toBe("priya");
    expect(handleOfRecipient("priya+anything@otto.jobs", SHORT)).toBe("priya");
    expect(handleOfRecipient("otto+priya@track.ottosensei.com", SHORT)).toBe("priya");
    expect(handleOfRecipient("priya@track.ottosensei.com", SHORT)).toBeNull();
  });
});
