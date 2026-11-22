import { describe, expect, it } from "vitest";
import { DAY_MS, HOUR_MS } from "@/lib/time";
import { buildRecap, usedOtto, type RecapApplication, type RecapFacts } from "./build";

const TZ = "Asia/Kolkata";
// Monday Nov 16 2026, 00:00 in Kolkata.
const WEEK_START = Date.UTC(2026, 10, 15, 18, 30);
const NOW = WEEK_START + 8 * DAY_MS + 3 * HOUR_MS;
const at = (day: number, hour = 10) => WEEK_START + day * DAY_MS + hour * HOUR_MS;

function application(overrides: Partial<RecapApplication> = {}): RecapApplication {
  const appliedAt = overrides.appliedAt ?? at(1);
  return {
    id: crypto.randomUUID(),
    company: "Notion",
    role: "Designer",
    jobUrl: "",
    jobId: null,
    appliedAt,
    status: "applied",
    stageReached: "applied",
    resumeId: null,
    statusHistory: [{ status: "applied", at: appliedAt }],
    interviewAt: null,
    followUpAt: null,
    prepAt: null,
    ...overrides,
  };
}

function facts(overrides: Partial<RecapFacts> = {}): RecapFacts {
  return {
    now: NOW,
    timeZone: TZ,
    pro: true,
    createdAt: WEEK_START - 30 * DAY_MS,
    applications: [],
    writings: [],
    resumes: [
      { id: "own", source: "import", tailored: false, createdAt: WEEK_START - 20 * DAY_MS },
    ],
    saved: [],
    activeDays: [],
    totals: { shareViews: 0, portfolioViews: 0 },
    shareOpened: false,
    portfolioLive: false,
    ...overrides,
  };
}

const LATEST = { previous: null, ranked: null };

describe("buildRecap", () => {
  it("counts the week's work against the week before", () => {
    const recap = buildRecap(
      facts({
        applications: [
          application({ appliedAt: at(0) }),
          application({ appliedAt: at(2) }),
          application({ appliedAt: at(6, 23) }),
          application({ appliedAt: at(-3) }),
          application({ appliedAt: at(7, 1) }),
        ],
        resumes: [
          { id: "own", source: "import", tailored: false, createdAt: at(-20) },
          { id: "t1", source: "tailored", tailored: true, createdAt: at(3) },
        ],
        writings: [
          { kind: "letter", createdAt: at(4), applicationId: null },
          { kind: "outreach", createdAt: at(4), applicationId: null },
          { kind: "letter", createdAt: at(-1), applicationId: null },
        ],
      }),
      "2026-11-16",
      LATEST,
    );
    expect(recap.effort).toMatchObject({
      applications: 3,
      tailored: 1,
      letters: 1,
      messages: 1,
      last: { applications: 1, tailored: 0, letters: 1 },
    });
    expect(recap.quiet).toBe(false);
  });

  it("has no last week for an account that didn't exist then", () => {
    const recap = buildRecap(facts({ createdAt: at(2) }), "2026-11-16", LATEST);
    expect(recap.effort.last).toBeNull();
  });

  it("tells each move forward as a journey, offers first", () => {
    const stripe = application({
      company: "Stripe",
      appliedAt: at(-10),
      status: "interview",
      statusHistory: [
        { status: "applied", at: at(-10) },
        { status: "interview", at: at(2) },
      ],
    });
    const figma = application({
      company: "Figma",
      appliedAt: at(-20),
      status: "offer",
      statusHistory: [
        { status: "applied", at: at(-20) },
        { status: "interview", at: at(-5) },
        { status: "offer", at: at(1) },
      ],
    });
    const canva = application({
      company: "Canva",
      appliedAt: at(-12),
      status: "rejected",
      statusHistory: [
        { status: "applied", at: at(-12) },
        { status: "rejected", at: at(3) },
      ],
    });
    const recap = buildRecap(facts({ applications: [stripe, figma, canva] }), "2026-11-16", LATEST);
    expect(recap.momentum).toEqual({
      replies: 3,
      interviews: 1,
      offers: 1,
      moves: [
        { company: "Figma", role: "Designer", path: ["interview", "offer"] },
        { company: "Stripe", role: "Designer", path: ["applied", "interview"] },
      ],
    });
  });

  it("counts the days used, from visits and from saved work", () => {
    const recap = buildRecap(
      facts({
        activeDays: ["2026-11-16", "2026-11-18", "2026-11-25"],
        applications: [application({ appliedAt: at(4, 20) })],
      }),
      "2026-11-16",
      LATEST,
    );
    // 20:00 on Friday in Kolkata is still Friday there.
    expect(recap.activeDays).toEqual(["2026-11-16", "2026-11-18", "2026-11-20"]);
  });

  it("is quiet when nothing happened, and still offers one step", () => {
    const recap = buildRecap(facts(), "2026-11-16", LATEST);
    expect(recap.quiet).toBe(true);
    expect(recap.next).toEqual([{ kind: "jobs", href: "/dashboard/jobs" }]);
    const free = buildRecap(facts({ pro: false, resumes: [] }), "2026-11-16", LATEST);
    expect(free.next).toEqual([{ kind: "upload", href: "/studio" }]);
  });

  it("plans next week: an interview, a follow-up, then a saved job to tailor for", () => {
    const interview = application({
      company: "Stripe",
      status: "interview",
      interviewAt: NOW + 2 * DAY_MS,
      prepAt: null,
    });
    const waiting = application({ company: "Notion", followUpAt: NOW + DAY_MS });
    const recap = buildRecap(
      facts({
        applications: [interview, waiting],
        saved: [
          {
            savedAt: at(3),
            company: "Linear",
            title: "Product Designer",
            url: "https://linear.app/careers/1",
            jobId: null,
            open: true,
          },
        ],
      }),
      "2026-11-16",
      LATEST,
    );
    expect(recap.next.map((step) => step.kind)).toEqual(["prep", "follow_up", "tailor"]);
    expect(recap.next[0]).toMatchObject({
      href: `/dashboard/applications/${interview.id}/prep?start=1`,
    });
    expect(recap.next[2]).toMatchObject({
      href: "/studio?job=https%3A%2F%2Flinear.app%2Fcareers%2F1",
    });
  });

  it("counts views since last week's recap, or the total when there's none", () => {
    const totals = { shareViews: 20, portfolioViews: 44 };
    const withPrevious = buildRecap(facts({ totals, portfolioLive: true }), "2026-11-16", {
      previous: { totals: { shareViews: 14, portfolioViews: 30 }, builtAt: WEEK_START + HOUR_MS },
      ranked: null,
    });
    expect(withPrevious.attention).toEqual({
      share: { views: 6, since: WEEK_START + HOUR_MS },
      portfolio: { views: 14, since: WEEK_START + HOUR_MS },
    });
    const first = buildRecap(
      facts({ totals, shareOpened: false, portfolioLive: true }),
      "2026-11-16",
      LATEST,
    );
    expect(first.attention).toEqual({ share: null, portfolio: { views: 44, since: null } });
    expect(first.totals).toEqual(totals);
  });

  it("names the best match only on Pro, as the Jobs tab does", () => {
    const ranked = {
      matches: 38,
      best: { title: "Designer", company: "Stripe", url: "https://x.co/j" },
    };
    const pro = buildRecap(facts(), "2026-11-16", { previous: null, ranked });
    expect(pro.jobs).toEqual({
      matches: 38,
      best: { title: "Designer", company: "Stripe" },
      saved: 0,
    });
    const free = buildRecap(facts({ pro: false }), "2026-11-16", { previous: null, ranked });
    expect(free.jobs).toEqual({ matches: 38, best: null, saved: 0 });
  });

  it("keeps an earlier week to what can still be counted", () => {
    const recap = buildRecap(
      facts({
        applications: [application({ appliedAt: at(1) })],
        totals: { shareViews: 9, portfolioViews: 0 },
      }),
      "2026-11-16",
      null,
    );
    expect(recap.next).toEqual([]);
    expect(recap.working).toBeNull();
    expect(recap.attention).toEqual({ share: null, portfolio: null });
  });

  it("says what's working only from enough applications", () => {
    const fresh = buildRecap(
      facts({ applications: [application({ resumeId: "own" })] }),
      "2026-11-16",
      LATEST,
    );
    expect(fresh.working).toEqual({
      kind: "line",
      text: "1 application from the past 7 days isn't counted yet: replies take time.",
    });
    const older = buildRecap(
      facts({ applications: [application({ resumeId: "own", appliedAt: at(-9) })] }),
      "2026-11-16",
      LATEST,
    );
    expect(older.working).toEqual({
      kind: "line",
      text: "Counted so far: 0 tailored versions and 1 general resume. Otto compares from 5 of each.",
    });
    const unknown = buildRecap(
      facts({ applications: [application({ appliedAt: at(-9) })] }),
      "2026-11-16",
      LATEST,
    );
    expect(unknown.working).toBeNull();
  });
});

describe("usedOtto", () => {
  it("is false for an account with only the sample", () => {
    expect(
      usedOtto(facts({ resumes: [{ id: "s", source: "sample", tailored: false, createdAt: 0 }] })),
    ).toBe(false);
    expect(usedOtto(facts())).toBe(true);
  });
});
