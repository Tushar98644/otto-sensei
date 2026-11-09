import { describe, expect, it } from "vitest";
import { checkEligibility, ruleLines } from "./check";
import { emptyWorkProfile, type WorkProfile } from "./profile";
import type { EligibilityFinding, EligibilityRule } from "./types";

// Whole job posts in the shapes the big boards send (Greenhouse, Lever, Ashby, Workable), with
// the company intros and benefit lists that trip naive matching. Companies are made up.

// November 9, 2026: standard time in both the US and Europe.
const NOW = Date.UTC(2026, 10, 9, 12);

const person = (overrides: Partial<WorkProfile>): WorkProfile => ({
  ...emptyWorkProfile(),
  ...overrides,
});
const NO_RIGHTS = { us: null, uk: null, eu: null, ca: null } as const;

const LAGOS = person({
  country: "NG",
  timeZone: "Africa/Lagos",
  rights: { ...NO_RIGHTS, uk: "sponsorship" },
});
const MANILA = person({
  country: "PH",
  timeZone: "Asia/Manila",
  rights: { us: "sponsorship", uk: "sponsorship", eu: "sponsorship", ca: "sponsorship" },
});
const SAO_PAULO = person({
  country: "BR",
  timeZone: "America/Sao_Paulo",
  rights: { ...NO_RIGHTS, eu: "sponsorship" },
});
const BERLIN = person({
  country: "DE",
  timeZone: "Europe/Berlin",
  rights: { ...NO_RIGHTS, us: "sponsorship", eu: "authorized" },
  contract: false,
});
const DENVER = person({
  country: "US",
  timeZone: "America/Denver",
  rights: { ...NO_RIGHTS, us: "authorized" },
});
const VANCOUVER = person({
  country: "CA",
  timeZone: "America/Vancouver",
  rights: { ...NO_RIGHTS, ca: "authorized" },
});

function check(location: string, text: string, who: WorkProfile | null) {
  const findings = checkEligibility({ location, text }, who, { now: NOW });
  // The Jobs tab stores and checks only these sentences, so they must give the same findings.
  expect(checkEligibility({ location, text: ruleLines(text) }, who, { now: NOW })).toEqual(findings);
  return Object.fromEntries(findings.map((item) => [item.rule, item])) as Partial<
    Record<EligibilityRule, EligibilityFinding>
  >;
}

const verdicts = (result: Partial<Record<EligibilityRule, EligibilityFinding>>) =>
  Object.fromEntries(Object.entries(result).map(([rule, item]) => [rule, item.verdict]));

const LEVER_EMEA = `Location: Remote - EMEA
Team: Platform
Commitment: Full-time

About Northwind
Northwind is a London-based fintech helping 40,000 small businesses get paid faster.

What you'll do
- Run our Kubernetes platform and the tools around it
- Mentor two engineers

Where you'll work
This role is open to candidates based in EMEA. You'll need at least 3 hours of overlap with UK time.
We can't offer visa sponsorship for this role.`;

describe("a Lever post: remote in EMEA, no sponsorship", () => {
  it("reads the Location line and clears someone in Lagos", () => {
    const result = check("", LEVER_EMEA, LAGOS);
    expect(verdicts(result)).toEqual({
      location: "ok",
      sponsorship: "ok",
      time_zone: "ok",
      work_type: "ok",
    });
    expect(result.location).toMatchObject({ quote: "Location: Remote - EMEA", source: "post" });
    expect(result.sponsorship?.note).toBe(
      "They don't sponsor visas, but you'd work from Nigeria, where you live.",
    );
    expect(result.time_zone?.note).toBe(
      "A 9 to 5 day gives you 7 hours of overlap with UK time. They ask for 3.",
    );
  });

  it("blocks someone in Manila, and doesn't read the London-based intro as a rule", () => {
    const result = check("", LEVER_EMEA, MANILA);
    expect(result.location).toMatchObject({
      verdict: "blocked",
      note: "This is for people in EMEA. You live in the Philippines.",
    });
    expect(result.location?.quote).not.toContain("London-based");
    expect(result.time_zone?.verdict).toBe("check");
  });
});

const ASHBY_TORONTO = `Senior Product Designer
Employment type: Full time

You'll shape the booking flow used by 2 million patients a year.

Must be legally eligible to work in Canada. Unfortunately, we are not able to sponsor work permits at this time.
We're in the office Tuesday to Thursday.`;

describe("an Ashby post: hybrid in Toronto", () => {
  it("asks someone in the US to fill in their Canada answer", () => {
    const result = check("Toronto, ON (Hybrid)", ASHBY_TORONTO, DENVER);
    expect(result.location).toMatchObject({
      verdict: "blocked",
      note: "The job is in Canada, and it isn't remote.",
    });
    expect(result.authorization).toMatchObject({
      verdict: "check",
      gap: "rights",
      quote: "Must be legally eligible to work in Canada.",
    });
    expect(result.sponsorship).toMatchObject({ verdict: "check", gap: "rights" });
  });

  it("clears someone in Vancouver who can work in Canada", () => {
    expect(verdicts(check("Toronto, ON (Hybrid)", ASHBY_TORONTO, VANCOUVER))).toEqual({
      location: "ok",
      authorization: "ok",
      sponsorship: "ok",
      work_type: "ok",
    });
  });
});

const WORKABLE_EU_CONTRACT = `Location: Remote (EU)
We're a Warsaw-based software house working with clients across Europe and the US.
You must be based in the EU and able to invoice as a company (B2B contract).
Working hours: 9:00 to 17:00 CET, with some flexibility.`;

describe("a Workable post: an EU-only B2B contract", () => {
  it("flags the contract for someone who only wants full-time", () => {
    const result = check("", WORKABLE_EU_CONTRACT, BERLIN);
    expect(result.location?.verdict).toBe("ok");
    expect(result.time_zone?.verdict).toBe("ok");
    expect(result.work_type).toMatchObject({
      verdict: "check",
      note: "It's a contract role. Your work profile says full-time only.",
      quote: "You must be based in the EU and able to invoice as a company (B2B contract).",
    });
  });

  it("blocks someone outside the EU and shows how far off their hours are", () => {
    const result = check("", WORKABLE_EU_CONTRACT, SAO_PAULO);
    expect(result.location).toMatchObject({
      verdict: "blocked",
      note: "This is for people in the EU. You live in Brazil.",
    });
    expect(result.time_zone?.note).toBe(
      "You're on UTC-3, 4 hours from CET. You'd need to shift your hours.",
    );
  });
});

describe("a fully remote, worldwide post", () => {
  const post = `We're a fully remote team of 40 people spread across 18 countries and many time zones.
We hire anywhere in the world and pay everyone in USD.
We work async, so there are no fixed hours.`;

  it("says OK for anyone and finds no hours rule in the team description", () => {
    const result = check("Remote (Worldwide)", post, MANILA);
    expect(verdicts(result)).toEqual({ location: "ok" });
    expect(result.location).toMatchObject({ source: "location", quote: "Remote (Worldwide)" });
  });
});

describe("an on-site US job that sponsors", () => {
  const post = `This role is on-site at our Austin office five days a week.
We offer relocation assistance and will sponsor H-1B visas for this role.`;

  it("reads H-1B as a US visa and turns the move into a question", () => {
    const result = check("Austin, TX", post, BERLIN);
    expect(result.location).toMatchObject({
      verdict: "check",
      note: "The job is in the US, and they sponsor visas. You'd need to move.",
    });
    expect(result.sponsorship).toMatchObject({
      verdict: "ok",
      note: "They sponsor visas, and you said you'd need one for the US.",
    });
  });
});

describe("a citizenship requirement", () => {
  const post = "Must be a U.S. citizen with the ability to obtain a Secret clearance.";

  it("asks more than the right to work, and blocks anyone who needs a visa", () => {
    expect(check("Washington, DC", post, DENVER).authorization).toMatchObject({
      verdict: "check",
      note: "They ask for citizenship in the US, not just the right to work. Check that you have it.",
    });
    expect(check("Washington, DC", post, BERLIN).authorization?.verdict).toBe("blocked");
  });

  it("ignores citizenship in an equal-opportunity line", () => {
    const eeo =
      "We do not discriminate on the basis of race, religion, national origin or citizenship status.";
    expect(check("", eeo, DENVER)).toEqual({});
  });
});

describe("posts with places but no rules", () => {
  it("doesn't treat a company intro, customers or a product as a rule", () => {
    const post = `Acme is a Berlin-based startup building tools for bakeries. We're based in San Francisco.
We help people in the US and Europe file their taxes faster. We're a B2B SaaS company.
Our app is available in the US only, and most of our customers are in the UK.
You'll work with contractors, agencies and our permanent residents program team.`;
    expect(checkEligibility({ location: "", text: post }, MANILA, { now: NOW })).toEqual([]);
  });
});

describe("location lines are alternatives", () => {
  it("is OK when any one of them covers the person", () => {
    const result = check("Remote - US", "We also hire in Canada.", VANCOUVER);
    expect(result.location).toMatchObject({ verdict: "ok", quote: "We also hire in Canada." });
  });

  it("lists every place when none covers the person", () => {
    const result = check("Remote - US", "We also hire in Canada.", MANILA);
    expect(result.location?.note).toBe(
      "This is for people in the US or Canada. You live in the Philippines.",
    );
  });

  it("asks when the field gives a city or remote", () => {
    const result = check("New York, NY or Remote", "Full-time.", MANILA);
    expect(result.location).toMatchObject({
      verdict: "check",
      note: "The post lists the US and says remote. Ask if they hire from the Philippines.",
    });
  });

  it("softens a residence rule that offers a move", () => {
    const result = check("", "You must be based in London or willing to relocate there.", MANILA);
    expect(result.location).toMatchObject({
      verdict: "check",
      note: "This is for people in the UK, or willing to move there. You live in the Philippines.",
    });
  });
});

describe("APAC hours", () => {
  const post = "Remote - APAC. Candidates must be within 3 hours of Singapore time (SGT).";

  it("checks both the region and the hours", () => {
    expect(verdicts(check("", post, MANILA))).toEqual({ location: "ok", time_zone: "ok" });
    expect(verdicts(check("", post, LAGOS))).toEqual({ location: "blocked", time_zone: "blocked" });
  });
});

const GREENHOUSE_PAY = `Staff Data Engineer
We're a remote-first company with hubs in New York and London.

About the role
- Own the pipelines behind our pricing engine
- Partner with analysts across 3 time zones

The base salary range for US-based candidates is $150,000 - $180,000. Benefits include health insurance for US employees and a stipend elsewhere.
We sponsor conference trips and your AWS certification.`;

describe("a Greenhouse post with pay by place and perks", () => {
  it("doesn't read a US salary band or a conference budget as rules", () => {
    const result = check("Remote · New York, NY", GREENHOUSE_PAY, MANILA);
    expect(verdicts(result)).toEqual({ location: "check" });
    expect(result.location?.note).toBe(
      "The post lists the US and says remote. Ask if they hire from the Philippines.",
    );
  });
});

describe("a job board location that joins remote and the allowed countries", () => {
  const post = `Visa sponsorship: No
Job type: Full-time`;

  it("limits the job to those countries, and ties the visa answer to them", () => {
    const result = check("Remote · United States · Canada", post, MANILA);
    expect(result.location).toMatchObject({
      verdict: "blocked",
      note: "This is for people in the US or Canada. You live in the Philippines.",
    });
    expect(result.sponsorship).toMatchObject({ verdict: "blocked", quote: "Visa sponsorship: No" });
    expect(verdicts(check("Remote · United States · Canada", post, DENVER))).toEqual({
      location: "ok",
      sponsorship: "ok",
      work_type: "ok",
    });
  });

  it("ties a bare 'no sponsorship' line to a 'US only' line in the text", () => {
    const result = check("Remote", "Remote (US only). No sponsorship.", MANILA);
    expect(result.sponsorship).toMatchObject({
      verdict: "blocked",
      note: "They don't sponsor visas, and you said you'd need one for the US.",
    });
  });
});

describe("a remote-first company with office days", () => {
  const post = `We're a remote-first company, but this role needs 2 days per week in our SF office.
Must be within 2.5 hours of US Eastern time.`;

  it("reads the office days as a hybrid job, and half-hour windows", () => {
    const result = check("San Francisco, CA", post, BERLIN);
    expect(result.location).toMatchObject({
      verdict: "blocked",
      note: "The job is in the US, and it isn't remote.",
    });
    expect(result.time_zone).toMatchObject({
      verdict: "blocked",
      note: "You're on UTC+1, 6 hours from Eastern time. The post asks for 2.5 at most.",
    });
  });

  it("keeps a remote job with office trips remote", () => {
    const remote = "Fully remote. We meet at our Berlin office once a quarter.\nUS only.";
    expect(check("Remote", remote, DENVER).location?.verdict).toBe("ok");
  });
});

describe("work rights where you live", () => {
  const post = `We hire anywhere through an employer of record.
You must be authorized to work in your country of residence. We do not sponsor visas.`;

  it("needs no visa, so both lines are OK", () => {
    const result = check("Remote", post, MANILA);
    expect(result.authorization).toMatchObject({
      verdict: "ok",
      note: "They ask for the right to work where you live, in the Philippines.",
    });
    expect(result.sponsorship).toMatchObject({
      verdict: "ok",
      note: "They don't sponsor visas, but you'd work from the Philippines, where you live.",
    });
  });

  it("asks for the country when the profile has none", () => {
    expect(check("Remote", post, null).authorization).toMatchObject({
      verdict: "check",
      gap: "country",
    });
  });
});
