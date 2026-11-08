import { describe, expect, it } from "vitest";
import { checkEligibility, worstVerdict } from "./check";
import { findPlaces } from "./places";
import { emptyWorkProfile, type WorkProfile } from "./profile";
import { findTimeRule, formatHours, formatOffset, gapMinutes, offsetMinutes } from "./time";
import type { EligibilityFinding, EligibilityRule } from "./types";

// November 9, 2026: after both the US and Europe left daylight saving time.
const NOW = Date.UTC(2026, 10, 9, 12);

function profile(overrides: Partial<WorkProfile> = {}): WorkProfile {
  return { ...emptyWorkProfile(), ...overrides };
}

const MANILA = profile({
  country: "PH",
  timeZone: "Asia/Manila",
  rights: { us: "sponsorship", uk: "sponsorship", eu: "sponsorship", ca: "sponsorship" },
});
const TEXAS = profile({
  country: "US",
  timeZone: "America/Chicago",
  rights: { us: "authorized", uk: null, eu: null, ca: null },
});
const BERLIN = profile({
  country: "DE",
  timeZone: "Europe/Berlin",
  rights: { us: "sponsorship", uk: null, eu: "authorized", ca: null },
});

function byRule(
  findings: EligibilityFinding[],
): Partial<Record<EligibilityRule, EligibilityFinding>> {
  return Object.fromEntries(findings.map((item) => [item.rule, item]));
}

const run = (location: string, text: string, who: WorkProfile | null, deviceTimeZone?: string) =>
  byRule(checkEligibility({ location, text }, who, { now: NOW, deviceTimeZone }));

const US_REMOTE = `About the role
We're looking for a Senior Backend Engineer to join our Payments team.
- 5+ years building production services in Go or Java
Location
This role is fully remote, but you must be based in the United States.
Applicants must be authorized to work in the US. We are unable to sponsor or take over sponsorship of an employment visa at this time.
This is a full-time position.`;

describe("checkEligibility: a US-only remote job", () => {
  it("blocks someone abroad who needs a visa, quoting each line", () => {
    const result = run("Remote - US", US_REMOTE, MANILA);
    expect(result.location).toMatchObject({
      verdict: "blocked",
      source: "location",
      quote: "Remote - US",
    });
    expect(result.location?.note).toBe(
      "This is for people in the US. You live in the Philippines.",
    );
    expect(result.authorization).toMatchObject({
      verdict: "blocked",
      quote: "Applicants must be authorized to work in the US.",
    });
    expect(result.sponsorship).toMatchObject({
      verdict: "blocked",
      quote:
        "We are unable to sponsor or take over sponsorship of an employment visa at this time.",
    });
    expect(result.work_type?.verdict).toBe("ok");
    expect(result.time_zone).toBeUndefined();
  });

  it("is OK across the board for someone in the US who can work there", () => {
    const result = run("Remote - US", US_REMOTE, TEXAS);
    expect(Object.values(result).map((item) => item.verdict)).toEqual(["ok", "ok", "ok", "ok"]);
    expect(result.location?.note).toBe("You live in the US, which this covers.");
  });

  it("asks for the missing profile facts instead of guessing", () => {
    const result = run("Remote - US", US_REMOTE, null);
    expect(result.location).toMatchObject({ verdict: "check", gap: "country" });
    expect(result.authorization).toMatchObject({ verdict: "check", gap: "rights" });
    expect(result.sponsorship).toMatchObject({ verdict: "check", gap: "rights" });
    // Job type needs a saved profile: there is no preference to compare with.
    expect(result.work_type).toBeUndefined();
  });
});

describe("checkEligibility: time zones", () => {
  const EU_POST = `We're a fully distributed team across Europe.
You'll need to work in EU time zones and overlap at least 4 hours with CET.
Contract or full-time employment through our employer-of-record partner.`;

  it("accepts someone inside the range", () => {
    const result = run("Remote, Europe", EU_POST, BERLIN);
    expect(result.location?.verdict).toBe("ok");
    expect(result.time_zone).toMatchObject({
      verdict: "ok",
      quote: "You'll need to work in EU time zones and overlap at least 4 hours with CET.",
    });
    expect(result.work_type?.note).toBe("It's full-time or contract, which you're open to.");
  });

  it("blocks someone hours outside a named range", () => {
    const brazil = profile({ country: "BR", timeZone: "America/Sao_Paulo" });
    const result = run("Remote, Europe", EU_POST, brazil);
    expect(result.location?.verdict).toBe("blocked");
    expect(result.time_zone).toMatchObject({ verdict: "blocked" });
    expect(result.time_zone?.note).toBe("You're on UTC-3, 3 hours outside European time zones.");
  });

  it("works out overlap the short way round and suggests shifting hours", () => {
    const post = `This is a 6-month contract role (B2B), open to candidates anywhere.
You must have at least 4 hours of overlap with PST.`;
    const fullTimeOnly = { ...MANILA, contract: false };
    const result = run("Remote", post, fullTimeOnly);
    expect(result.location).toMatchObject({
      verdict: "ok",
      note: "The post says you can work from anywhere.",
    });
    expect(result.time_zone?.verdict).toBe("check");
    expect(result.time_zone?.note).toBe(
      "A 9 to 5 day gives you 0 hours of overlap with Pacific time. They ask for 4. You'd need to shift your hours.",
    );
    expect(result.work_type).toMatchObject({
      verdict: "check",
      note: "It's a contract role. Your work profile says full-time only.",
    });
  });

  it("checks 'within N hours' against the profile, or the device when the profile has none", () => {
    const post =
      "Remote-friendly: you can work from anywhere in Canada, within 3 hours of Eastern Time.";
    const vancouver = profile({ country: "CA", timeZone: "America/Vancouver" });
    expect(run("Toronto, ON", post, vancouver).time_zone).toMatchObject({
      verdict: "ok",
      note: "You're on UTC-8, 3 hours from Eastern time. The post allows 3.",
    });
    const mexico = profile({ country: "MX" });
    const result = run("Toronto, ON", post, mexico, "Europe/London");
    expect(result.location?.verdict).toBe("blocked");
    expect(result.time_zone).toMatchObject({
      verdict: "blocked",
      note: "This device is on UTC, 5 hours from Eastern time. The post asks for 3 at most.",
    });
  });

  it("reads a UTC range", () => {
    const post = "We hire anywhere between UTC-5 and UTC+1 so the team keeps a shared morning.";
    const lagos = profile({ country: "NG", timeZone: "Africa/Lagos" });
    expect(run("", post, lagos).time_zone).toMatchObject({
      verdict: "ok",
      note: "You're on UTC+1, inside UTC-5 to UTC+1.",
    });
    expect(run("", post, MANILA).time_zone?.verdict).toBe("blocked");
  });
});

describe("checkEligibility: on-site jobs", () => {
  it("says 'check' when they sponsor visas for a hybrid London role", () => {
    const post = `This is a hybrid role, 3 days a week in our London office.
We offer visa sponsorship for this role.
You must have the right to work in the UK or be eligible for a Skilled Worker visa.`;
    const result = run("London, UK", post, MANILA);
    expect(result.location).toMatchObject({
      verdict: "check",
      note: "The job is in the UK, and they sponsor visas. You'd need to move.",
    });
    expect(result.authorization?.verdict).toBe("check");
    expect(result.sponsorship).toMatchObject({
      verdict: "ok",
      note: "They sponsor visas, and you said you'd need one for the UK.",
    });
  });

  it("blocks an office job abroad with no relocation, and softens it when relocation is offered", () => {
    const post = "You'll work on-site from our Austin office five days a week.";
    expect(run("Austin, TX", post, BERLIN).location).toMatchObject({
      verdict: "blocked",
      note: "The job is in the US, and it isn't remote.",
    });
    const withHelp = `${post}\nWe offer relocation assistance.`;
    expect(run("Austin, TX", withHelp, BERLIN).location?.verdict).toBe("check");
  });

  it("is OK in the person's own country", () => {
    expect(
      run("Berlin, Germany (Hybrid)", "Hybrid, 2 days in office.", BERLIN).location?.verdict,
    ).toBe("ok");
  });
});

describe("checkEligibility: posts without rules", () => {
  it("finds nothing in a post that sets no location, visa or hours rules", () => {
    const post = `We build tools for small bakeries.
- 3+ years with TypeScript and React
- You enjoy talking to customers`;
    expect(checkEligibility({ location: "", text: post }, MANILA, { now: NOW })).toEqual([]);
    expect(worstVerdict([])).toBeNull();
  });

  it("doesn't read 'Eastern Europe' or 'Asia-Pacific' as time zones", () => {
    expect(findTimeRule("We sell across Eastern Europe and Asia-Pacific.")).toBeNull();
  });
});

describe("findPlaces", () => {
  const codes = (line: string) =>
    findPlaces(line).map(({ place }) => (place.kind === "group" ? place.group : place.code));

  it("reads countries, regions and short forms", () => {
    expect(codes("Remote - US")).toEqual(["US"]);
    expect(codes("Remote (US or Canada)")).toEqual(["US", "CA"]);
    expect(codes("Open to candidates in EMEA and LATAM")).toEqual(["emea", "latam"]);
    expect(codes("Belfast, Northern Ireland")).toEqual(["GB"]);
  });

  it("keeps country names that are also places or people out of it", () => {
    expect(codes("Atlanta, Georgia")).toEqual([]);
    expect(codes("Berlin, DE")).toEqual(["DE"]);
    expect(codes("Austin, TX")).toEqual(["US"]);
    expect(codes("We meet in the US offices; the rest of us work from home")).toEqual(["US"]);
  });
});

describe("time helpers", () => {
  it("formats offsets and gaps", () => {
    expect(offsetMinutes("Asia/Kolkata", NOW)).toBe(330);
    expect(offsetMinutes("Not/AZone", NOW)).toBeNull();
    expect(gapMinutes(330, -480)).toBe(630);
    expect(gapMinutes(780, -600)).toBe(60);
    expect(formatOffset(330)).toBe("UTC+5:30");
    expect(formatOffset(-480)).toBe("UTC-8");
    expect(formatHours(570)).toBe("9.5 hours");
    expect(formatHours(60)).toBe("1 hour");
  });
});
