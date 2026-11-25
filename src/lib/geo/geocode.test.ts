import { describe, expect, it } from "vitest";
import { cityById, cityIdsNear, cityKey, distanceKm, searchCities } from "./cities";
import { geocode } from "./geocode";

const place = (location: string, countries: string[] = []) => {
  const city = geocode(location, countries);
  return city
    ? `${city.ascii}, ${city.country}${city.country === "US" ? `-${city.admin}` : ""}`
    : null;
};

describe("geocode", () => {
  it.each([
    ["San Francisco, CA", ["US"], "San Francisco, US-CA"],
    ["New York, NY", ["US"], "New York City, US-NY"],
    ["New York, New York", ["US"], "New York City, US-NY"],
    ["NYC", [], "New York City, US-NY"],
    ["Washington, DC", ["US"], "Washington, US-DC"],
    ["Portland, OR", ["US"], "Portland, US-OR"],
    ["Portland, ME", ["US"], "Portland, US-ME"],
    ["Cambridge, MA", ["US"], "Cambridge, US-MA"],
    ["London, United Kingdom", ["GB"], "London, GB"],
    ["London, Ontario, Canada", ["CA"], "London, CA"],
    ["Toronto, ON", ["CA"], "Toronto, CA"],
    ["Hybrid · Amsterdam, Noord-Holland, Netherlands", ["NL"], "Amsterdam, NL"],
    ["Stockholm · Hybrid", ["SE"], "Stockholm, SE"],
    ["Bangalore, Karnataka, India", ["IN"], "Bengaluru, IN"],
    ["Gurgaon", ["IN"], "Gurugram, IN"],
    ["Cologne, Germany", ["DE"], "Koeln, DE"],
    ["München", ["DE"], "Munich, DE"],
    ["Frankfurt", [], "Frankfurt am Main, DE"],
    ["Zürich, Switzerland", ["CH"], "Zuerich, CH"],
    ["São Paulo, Brazil", ["BR"], "Sao Paulo, BR"],
    ["USA-CA-San Jose", ["US"], "San Jose, US-CA"],
    ["Berlin, Germany; Munich, Germany", ["DE"], "Berlin, DE"],
    ["Singapore", ["SG"], "Singapore, SG"],
    ["St. Louis, MO", ["US"], "St. Louis, US-MO"],
    ["Saint Louis, Missouri", ["US"], "St. Louis, US-MO"],
  ])("%s", (location, countries, expected) => {
    expect(place(location, countries)).toBe(expected);
  });

  it.each([
    "",
    "Remote",
    "Remote - US",
    "United States",
    "California",
    "Washington",
    "2 Locations",
    "Anywhere in the world",
    "EMEA",
  ])("finds no city in %j", (location) => {
    expect(place(location, [])).toBeNull();
  });

  it("keeps to the countries the post names", () => {
    expect(place("Victoria", ["AU"])).toBeNull();
    expect(place("Paris", ["US"])).toMatch(/^Paris, US/);
  });
});

describe("cities", () => {
  it("reads names alike with or without accents", () => {
    expect(cityKey("Zürich")).toBe("zurich");
    expect(cityKey("Saint-Étienne")).toBe("st etienne");
  });

  it("finds cities near a point, nearest first", () => {
    const sf = geocode("San Francisco, CA", ["US"])!;
    const ids = cityIdsNear(sf, 25);
    expect(ids[0]).toBe(sf.id);
    const oakland = geocode("Oakland, CA", ["US"])!;
    expect(ids).toContain(oakland.id);
    expect(ids).not.toContain(geocode("San Jose, CA", ["US"])!.id);
    expect(distanceKm(sf, oakland)).toBeLessThan(25);
  });

  it("searches by the start of a name, the biggest first", () => {
    const [first] = searchCities("lond", 5);
    expect(first?.ascii).toBe("London");
    expect(first?.country).toBe("GB");
    expect(searchCities("l", 5)).toEqual([]);
    expect(cityById(first!.id)).toEqual(first);
  });
});
