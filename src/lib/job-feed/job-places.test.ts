import { describe, expect, it } from "vitest";
import { jobPlaces, jobPlaceTokens, residenceZones, textPlaceTokens } from "./job-places";
import { acceptedPlaces, placeFit } from "./looking-for";

const NA = "g:north_america";

describe("jobPlaceTokens", () => {
  it("reads cities, states and country-code prefixes in location lines", () => {
    expect(jobPlaceTokens("Connecticut")).toEqual(["US"]);
    expect(jobPlaceTokens("Prague")).toEqual(["CZ"]);
    expect(jobPlaceTokens("Remote · Delhi · Karnataka")).toEqual(["IN"]);
    expect(jobPlaceTokens("Beijing, China")).toEqual(["CN"]);
    expect(jobPlaceTokens("KR - Seoul")).toEqual(["KR"]);
    expect(jobPlaceTokens("CN - Tianjin")).toEqual(["CN"]);
    expect(jobPlaceTokens("UK - Newport")).toEqual(["GB"]);
  });

  it("leaves a two-letter prefix that could be a US state to the city after it", () => {
    expect(jobPlaceTokens("IN - Indianapolis")).toEqual(["US"]);
    expect(jobPlaceTokens("IL - Tel Aviv")).toEqual(["IL"]);
    expect(jobPlaceTokens("CA - Fresno")).toEqual([]);
  });
});

describe("textPlaceTokens", () => {
  it("reads the sentence that let a US-only job through for Remote, India", () => {
    const text =
      "This is a remote position open to candidates based in the United States and in the Pacific Timezone.";
    expect(textPlaceTokens(text)).toEqual(["US"]);
  });

  it.each([
    ["All of our roles are U.S.-based.", ["US"]],
    ["Candidates must work from a U.S. based location.", ["US"]],
    ["You must be based in an Airship-eligible U.S. location.", ["US"]],
    ["This position is US - Remote Eligible.", ["US"]],
    [
      "This role is fully remote within the United States, with core hours on US Eastern time.",
      ["US"],
    ],
    ["We're hiring US-based engineers only.", ["US"]],
    ["Location: This role is based in the EMEA region", ["g:emea"]],
    ["This role is based out of our Prague office.", ["CZ"]],
    ["This role is based in Lille, with 2 days of remote work per week.", ["FR"]],
    ["Must be based in MST or PST time zone", [NA]],
    ["This role requires candidates to be based in the Pacific Time Zone.", [NA]],
    ["This remote role is open to candidates in Mountain and Central Time Zones.", [NA]],
    ["This role is 100% remote for candidates based in EST or CST", [NA]],
    ["Only candidates located in MST and PST time zones will be considered.", [NA]],
    [
      "NOTE: Candidates must reside in Pacific Time Zone / West Coast in order to be considered",
      [NA],
    ],
    ["We are only considering candidates based in the PT zone, as there will be travel.", [NA]],
    [
      "Smartling is seeking a Program Manager, Life Sciences based in the Eastern or Central time zones.",
      [NA],
    ],
    ["Work from EMEA time zones.", ["g:emea"]],
    ["This role must be based in an APJ / APAC timezone to provide coverage.", ["g:apac"]],
    ["Required time zone CET +/- 3 hour.", ["g:emea", "g:europe"]],
    [
      "Applicants from any country are welcome as long as they are located within approximately ± 4 hours of CET.",
      ["g:emea", "g:europe", "g:latam"],
    ],
    ["Candidates must be located between UTC-3 and UTC+3.", ["g:emea", "g:europe", "g:latam"]],
  ])("restricts: %s", (line, tokens) => {
    expect(textPlaceTokens(line)).toEqual(tokens);
  });

  it.each([
    "Must be amenable to working U.S. Eastern Time (ET) business hours to ensure collaboration.",
    "Working Hours: 3:00 AM - 12:00 PM EST, Monday to Friday",
    "This role is remote, with Pacific Time working hours preferred.",
    "Core working hours: 8:30 AM to 5:30 PM Pacific Time (11:30 AM to 8:30 PM Eastern Time)",
    "Flexible to work in USA PST morning overlapping work hours as per requirement",
    "We operate on PST and candidates in any time zone are welcome to apply.",
    "We're a tight knit team spread across Europe and eastern US timezones.",
    "Every team member, wherever they're based, maintains at least a 4-hour overlap with PST business hours.",
    "Candidates based in ET timezone will be given preference to accommodate team schedules.",
    "Preferred candidates will be located in PT or CT time zones to support team collaboration;",
    "Able to work a PST schedule (ideally located in Pacific, Mountain, Central time zones)",
    "This team operates within the Central European and GMT time zones for collaboration.",
    "Timezone: Working hours aligned with UTC ± 2 hours",
    "However, we prefer candidates based in GMT to GMT+3 or UK.",
    "We have offices located in San Francisco, New York, and Pittsburgh.",
    "You're comfortable operating across time zones, including colleagues based in APAC and EMEA.",
    "Our hiring range for this role is targeted at $182,000 - $248,000 for most US-based locations.",
    "You'll be joining a team, with the full support of our Paris-based functions (Product, Ops).",
    "Location: This is a globally remote role.",
    "We hire globally. We believe you can do your best work from anywhere.",
  ])("leaves open: %s", (line) => {
    expect(textPlaceTokens(line)).toEqual([]);
  });

  it("maps a time-zone rule only when it says where people live", () => {
    expect(residenceZones("Must be within 3 hours of UTC+5:30")).toContain("g:apac");
    expect(residenceZones("Must be available in EST business hours")).toEqual([]);
  });
});

describe("jobPlaces", () => {
  const usOnly = "This is a remote position open to candidates based in the United States.";

  it("takes the post's places when the location names none, or only Remote or Anywhere", () => {
    expect(jobPlaces("Remote", usOnly)).toEqual(["US"]);
    expect(jobPlaces("Anywhere", usOnly)).toEqual(["US"]);
    expect(jobPlaces("", usOnly)).toEqual(["US"]);
    expect(jobPlaces("Remote", "Location: Remote - India")).toEqual(["IN"]);
    expect(jobPlaces("Remote · Worldwide", "We hire globally.")).toEqual(["*"]);
    expect(jobPlaces("Remote", "We hire globally.")).toEqual([]);
  });

  it("keeps the location's own places when it names any", () => {
    expect(jobPlaces("Remote - India", usOnly)).toEqual(["IN"]);
  });

  it("keeps such a job from Remote, India and from no one who chose anywhere", () => {
    const places = jobPlaces("Remote", usOnly);
    expect(placeFit(places, acceptedPlaces("c:IN"))).toBe("miss");
    expect(placeFit(places, acceptedPlaces("c:US"))).toBe("match");
    expect(placeFit(places, acceptedPlaces("anywhere"))).toBe("unknown");
  });
});
