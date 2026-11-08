import { describe, expect, it } from "vitest";
import {
  CONTRACT,
  FULL_TIME,
  NO_SPONSOR,
  YES_SPONSOR,
  asksCitizenship,
  describesTeamOnly,
  offersSponsorship,
  refusesSponsorship,
  restrictedPlaces,
  saysOnSite,
  saysWorldwide,
  visaRegionIn,
} from "./cues";

const codes = (line: string, field = false) =>
  restrictedPlaces(line, undefined, { field }).map((place) =>
    place.kind === "group" ? place.group : place.code,
  );

describe("restrictedPlaces", () => {
  it("reads location fields", () => {
    expect(codes("Remote - US", true)).toEqual(["US"]);
    expect(codes("Remote (US & Canada)", true)).toEqual(["US", "CA"]);
    expect(codes("United States (Remote)", true)).toEqual(["US"]);
    expect(codes("Remote, LATAM", true)).toEqual(["latam"]);
    expect(codes("New York, NY or Remote", true)).toEqual([]);
    expect(codes("Berlin, Germany (Hybrid)", true)).toEqual([]);
  });

  it("reads rules in post lines, lists included", () => {
    expect(codes("Candidates must be based in the US, Canada or the UK.")).toEqual([
      "US",
      "CA",
      "GB",
    ]);
    expect(codes("This role is based in our London office.")).toEqual(["GB"]);
    expect(codes("We're hiring US-based engineers only.")).toEqual(["US"]);
    expect(codes("Open to candidates in EMEA and LATAM.")).toEqual(["emea", "latam"]);
    expect(codes("You can work from anywhere in the EU.")).toEqual(["eu"]);
  });

  it("leaves company intros, customers and products alone", () => {
    expect(
      codes("We're based in San Francisco, with a fully remote team across 20 countries."),
    ).toEqual([]);
    expect(codes("Acme is a Berlin-based startup building tools for bakeries.")).toEqual([]);
    expect(codes("We help people in the US and Europe file their taxes faster.")).toEqual([]);
    expect(codes("Our app is available in the US only, for now.")).toEqual([]);
  });
});

describe("phrases", () => {
  it("tells job types apart from look-alikes", () => {
    expect(FULL_TIME.test("This is a permanent, full-time role.")).toBe(true);
    expect(FULL_TIME.test("Must be a US citizen or permanent resident.")).toBe(false);
    expect(CONTRACT.test("This is a 6-month contract role.")).toBe(true);
    expect(CONTRACT.test("Paid as an independent contractor (1099).")).toBe(true);
    expect(CONTRACT.test("We're a B2B SaaS company.")).toBe(false);
    expect(CONTRACT.test("You'll work with contractors and agencies.")).toBe(false);
  });

  it("reads sponsorship both ways", () => {
    expect(NO_SPONSOR.test("Visa sponsorship is not available for this position.")).toBe(true);
    expect(NO_SPONSOR.test("We are unable to sponsor or take over sponsorship of a visa.")).toBe(
      true,
    );
    expect(YES_SPONSOR.test("We are open to sponsoring visas for the right person.")).toBe(true);
    expect(YES_SPONSOR.test("We can support you with an EU Blue Card.")).toBe(true);
    expect(YES_SPONSOR.test("Our sponsors include three national banks.")).toBe(false);
  });

  it("finds citizenship rules and the country a visa name points to", () => {
    expect(asksCitizenship("U.S. citizenship is required for this role.")).toBe(true);
    expect(asksCitizenship("UK citizens only.")).toBe(true);
    expect(asksCitizenship("We hire regardless of citizenship.")).toBe(false);
    expect(visaRegionIn("We can't sponsor H-1B visas.")).toBe("us");
    expect(visaRegionIn("No Skilled Worker visa sponsorship.")).toBe("uk");
    expect(visaRegionIn("We don't sponsor visas.")).toBeNull();
  });

  it("knows a team description from an hours rule, and worldwide from global", () => {
    expect(describesTeamOnly("Our team is spread across UTC-8 to UTC+2.")).toBe(true);
    expect(describesTeamOnly("You must overlap with teams across UTC-8 to UTC+2.")).toBe(false);
    expect(saysWorldwide("We hire candidates worldwide.")).toBe(true);
    expect(saysWorldwide("Our platform is used globally.")).toBe(false);
  });
});

describe("visa sponsorship, not perks", () => {
  it("ignores sponsored trips and courses unless a visa is named", () => {
    expect(offersSponsorship("We sponsor conference trips and pay for your learning budget.")).toBe(
      false,
    );
    expect(offersSponsorship("We will sponsor your AWS certification.")).toBe(false);
    expect(offersSponsorship("Visa sponsorship: Yes")).toBe(true);
    expect(refusesSponsorship("Visa sponsorship: No")).toBe(true);
    expect(refusesSponsorship("We can't sponsor relocation or travel visas.")).toBe(true);
    expect(refusesSponsorship("We don't sponsor events.")).toBe(false);
  });

  it("tells office days from office trips", () => {
    expect(saysOnSite("This role needs 3 days a week in our London office.")).toBe(true);
    expect(saysOnSite("You'll work from our Austin HQ.")).toBe(true);
    expect(saysOnSite("We meet at our Berlin office once a quarter.")).toBe(false);
    expect(saysOnSite("The final interview is on-site.")).toBe(false);
  });
});
