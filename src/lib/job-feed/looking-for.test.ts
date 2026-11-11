import { describe, expect, it } from "vitest";
import { emptyWorkProfile } from "@/lib/eligibility/profile";
import {
  acceptedPlaces,
  jobPlaceTokens,
  levelOf,
  lookingForOf,
  placeFit,
  placeFromProfile,
  placeLine,
  roleOptions,
  roleTitle,
  titleFits,
} from "./looking-for";
import { NO_CHOICE } from "./types";

const inCountry = (country: string) => ({ ...emptyWorkProfile(), country });

describe("the Looking for guess", () => {
  const profile = { titles: ["Senior Product Manager", "Business Analyst"], years: 6 };

  it("takes the role and level from the latest title, and the place from the work profile", () => {
    expect(lookingForOf(profile, inCountry("DE"))).toEqual({
      title: "Product Manager",
      family: "product",
      occupation: null,
      level: "senior",
      place: "g:eu",
      remote: false,
    });
    expect(placeLine(lookingForOf(profile, inCountry("DE")))).toBe("Remote or on-site, EU");
    expect(lookingForOf(profile, inCountry("US")).place).toBe("c:US");
    expect(lookingForOf(profile, inCountry("AU")).place).toBe("c:AU");
    expect(lookingForOf(profile, null).place).toBe("anywhere");
  });

  it("keeps each part the person picked and guesses the rest", () => {
    const picked = lookingForOf(profile, inCountry("GB"), {
      ...NO_CHOICE,
      level: "lead",
      remote: true,
    });
    expect(picked).toMatchObject({
      title: "Product Manager",
      level: "lead",
      place: "c:GB",
      remote: true,
    });
    expect(placeLine(picked)).toBe("Remote, UK");
    expect(placeLine({ place: "anywhere", remote: true })).toBe("Remote, anywhere");
  });

  it("names roles without their level, newest first, once each", () => {
    expect(roleTitle("Sr. Backend Engineer II")).toBe("Backend Engineer");
    expect(roleTitle("Senior Product Manager, Growth")).toBe("Product Manager");
    expect(roleTitle("Head of Design")).toBe("Head of Design");
    expect(
      roleOptions({ titles: ["Senior Data Scientist", "Data Scientist", "Founder"] }).map(
        (role) => role.title,
      ),
    ).toEqual(["Data Scientist", "Founder"]);
  });

  it("reads the level from the latest title, raised by years but never past senior", () => {
    expect(levelOf({ titles: ["Software Engineer"], years: 7 })).toBe("senior");
    expect(levelOf({ titles: ["Staff Engineer"], years: 3 })).toBe("lead");
    expect(levelOf({ titles: [], years: null })).toBeNull();
  });
});

describe("place fit", () => {
  it("reads where a job is from its location line", () => {
    expect(jobPlaceTokens("Remote · United States")).toEqual(["US"]);
    expect(jobPlaceTokens("Berlin, Germany")).toEqual(["DE"]);
    expect(jobPlaceTokens("Remote - EMEA")).toEqual(["g:emea"]);
    expect(jobPlaceTokens("Remote · Worldwide")).toEqual(["*"]);
    expect(jobPlaceTokens("")).toEqual([]);
  });

  it("matches a country or region choice, and calls a job elsewhere a miss", () => {
    const eu = acceptedPlaces("g:eu");
    expect(placeFit(["DE"], eu)).toBe("match");
    expect(placeFit(["g:emea"], eu)).toBe("match");
    expect(placeFit(["*"], eu)).toBe("match");
    expect(placeFit(["US"], eu)).toBe("miss");
    expect(placeFit([], eu)).toBe("unknown");
    const us = acceptedPlaces("c:US");
    expect(placeFit(["US"], us)).toBe("match");
    expect(placeFit(["g:north_america"], us)).toBe("match");
    expect(placeFit(["IN"], us)).toBe("miss");
    expect(placeFit(["DE"], acceptedPlaces("anywhere"))).toBe("unknown");
    expect(placeFromProfile(inCountry("FR"))).toBe("g:eu");
  });

  it("boosts a job title that names the role looked for", () => {
    expect(titleFits("Senior Product Manager, Growth", "Product Manager")).toBe(true);
    expect(titleFits("Product Designer", "Product Manager")).toBe(false);
    expect(titleFits("Anything", "")).toBe(false);
  });
});
