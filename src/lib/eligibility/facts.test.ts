import { describe, expect, it } from "vitest";
import { checkEligibility, parsePost, ruleLines } from "./check";
import { blockedHint, decodeFacts, encodeFacts, postFacts } from "./facts";
import { emptyWorkProfile, type WorkProfile } from "./profile";

const NOW = Date.UTC(2026, 10, 24, 12);
const NO_RIGHTS = { us: null, uk: null, eu: null, ca: null } as const;
const person = (overrides: Partial<WorkProfile>): WorkProfile => ({
  ...emptyWorkProfile(),
  ...overrides,
});

const PROFILES: (WorkProfile | null)[] = [
  null,
  person({
    country: "US",
    timeZone: "America/New_York",
    rights: { ...NO_RIGHTS, us: "authorized" },
  }),
  person({ country: "GB", timeZone: "Europe/London", rights: { ...NO_RIGHTS, us: "sponsorship" } }),
  person({
    country: "IN",
    timeZone: "Asia/Kolkata",
    rights: { us: "sponsorship", uk: "sponsorship", eu: "sponsorship", ca: "sponsorship" },
  }),
  person({ country: "BR", timeZone: "America/Sao_Paulo" }),
];

const POSTS = [
  { location: "Austin, TX", text: "Build services in Go." },
  {
    location: "Remote",
    text: "This role is open to candidates based in the United Kingdom only.\nWe do not sponsor visas.",
  },
  {
    location: "Remote - US",
    text: "You must be a US citizen.\nYou must overlap 4 hours with Pacific Time.",
  },
  {
    location: "",
    text: "Location: Berlin, Germany\nWe can sponsor a visa and help you relocate.",
  },
  {
    location: "Remote (Worldwide)",
    text: "Work from anywhere in the world. Applicants must be within UTC-3 to UTC+3.",
  },
  {
    location: "London, United Kingdom",
    text: "You must have the right to work in the country where you live. Full-time, permanent.",
  },
];

describe("work-rights facts", () => {
  it("give the same blocked verdict and note as the post's own lines, for every profile", () => {
    for (const post of POSTS) {
      const facts = postFacts({ location: post.location, text: ruleLines(post.text) });
      for (const profile of PROFILES) {
        for (const sponsorRegions of [[], ["uk" as const, "us" as const]]) {
          const options = { now: NOW, deviceTimeZone: "America/Chicago", sponsorRegions };
          const blocked = checkEligibility(
            { location: post.location, text: ruleLines(post.text) },
            profile,
            options,
          ).find((finding) => finding.verdict === "blocked");
          expect({ post: post.text, hint: blockedHint(facts, profile, options) }).toEqual({
            post: post.text,
            hint: { blocked: Boolean(blocked), note: blocked?.note ?? null },
          });
        }
      }
    }
  });

  it("read back what they wrote, without quotes or the lines that can't block", () => {
    const parsed = parsePost({
      location: "Remote",
      text: "Candidates must be based in the UK only. Must overlap 4 hours with Pacific Time; we don't sponsor visas.",
    });
    const facts = encodeFacts(parsed);
    expect(facts.length).toBeLessThan(200);
    expect(encodeFacts(decodeFacts(facts))).toBe(facts);
    expect(decodeFacts(facts).restricted.map((claim) => claim.quote)).toEqual(
      parsed.restricted.map(() => ""),
    );
    expect(decodeFacts("")).toMatchObject({ units: [], restricted: [], field: null });
    expect(blockedHint("", null, { now: NOW })).toEqual({ blocked: false, note: null });
  });
});
