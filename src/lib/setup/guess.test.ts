import { describe, expect, it } from "vitest";
import { emptyWorkProfile } from "@/lib/eligibility/profile";
import {
  countryInLocation,
  countryOfTimeZone,
  guessCountry,
  homeRegion,
  moveHomeRegion,
  type RightsDraft,
} from "./guess";

const blank = (): RightsDraft => ({ rights: emptyWorkProfile().rights, auto: null });

describe("guessing where someone lives", () => {
  it("reads the country from a resume's location line", () => {
    expect(countryInLocation("Lisbon, Portugal")).toBe("PT");
    expect(countryInLocation("Austin, TX")).toBe("US");
    expect(countryInLocation("Berlin")).toBe("DE");
    expect(countryInLocation("Remote")).toBeNull();
    expect(countryInLocation("")).toBeNull();
  });

  it("reads it from a time zone, under either of its names", () => {
    expect(countryOfTimeZone("Europe/Berlin")).toBe("DE");
    expect(countryOfTimeZone("America/Toronto")).toBe("CA");
    expect(countryOfTimeZone("Asia/Kolkata")).toBe("IN");
    expect(countryOfTimeZone("Asia/Calcutta")).toBe("IN");
    expect(countryOfTimeZone("UTC")).toBeNull();
    expect(countryOfTimeZone("Mars/Olympus")).toBeNull();
    expect(countryOfTimeZone("")).toBeNull();
  });

  it("prefers the newest resume that names a country, then the device", () => {
    expect(
      guessCountry({ locations: ["Remote", "Toronto, ON"], timeZone: "Europe/Berlin" }),
    ).toEqual({ code: "CA", from: "resume" });
    expect(guessCountry({ locations: ["Remote"], timeZone: "Europe/Berlin" })).toEqual({
      code: "DE",
      from: "device",
    });
    expect(guessCountry({ locations: [], timeZone: "UTC" })).toBeNull();
  });
});

describe("the work right that comes with living there", () => {
  it("maps a country to the region the profile asks about", () => {
    expect(homeRegion("PT")).toBe("eu");
    expect(homeRegion("GB")).toBe("uk");
    expect(homeRegion("PR")).toBe("us");
    expect(homeRegion("CA")).toBe("ca");
    expect(homeRegion("NO")).toBeNull();
    expect(homeRegion("")).toBeNull();
  });

  it("sets the home region to Yes, and takes only its own guess back on a new country", () => {
    const inPortugal = moveHomeRegion(blank(), "PT");
    expect(inPortugal).toMatchObject({ auto: "eu", rights: { eu: "authorized", uk: null } });
    const moved = moveHomeRegion(inPortugal, "GB");
    expect(moved).toMatchObject({ auto: "uk", rights: { eu: null, uk: "authorized" } });
    expect(moveHomeRegion(moved, "NO")).toMatchObject({ auto: null, rights: { uk: null } });
  });

  it("never guesses over an answer the person gave", () => {
    const inPortugal = moveHomeRegion(blank(), "PT");
    const answered = { rights: { ...inPortugal.rights, eu: "sponsorship" as const }, auto: null };
    expect(moveHomeRegion(answered, "GB").rights).toMatchObject({
      eu: "sponsorship",
      uk: "authorized",
    });
    const ownUk = { rights: { ...blank().rights, uk: "sponsorship" as const }, auto: null };
    expect(moveHomeRegion(ownUk, "GB")).toMatchObject({ auto: null, rights: { uk: "sponsorship" } });
  });
});
