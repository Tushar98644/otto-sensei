import { describe, expect, it } from "vitest";
import { emptyResume, type Resume } from "@/lib/resume/schema";
import { lintBullet, lintResume } from "./bullets";
import type { LintIssueId } from "./types";

const ids = (text: string) => lintBullet(text).map((issue) => issue.id);
const issue = (text: string, id: LintIssueId) => lintBullet(text).find((i) => i.id === id);

describe("lintBullet", () => {
  it.each([
    "Cut checkout errors 38% by rewriting the payment retry logic",
    "Led a team of 6 engineers to ship the mobile app in 4 months",
    "Grew newsletter signups from 2k to 11k in one quarter",
    "Built an internal search tool used by 300 support agents daily",
    "Reduced cloud costs by $40K a year by moving batch jobs to spot instances",
    "Mentored three junior developers, two of whom were promoted within a year",
    "Shipped twelve releases with zero downtime across five regions",
    "Raised €2M seed round from 14 angel investors",
    "Built tools that helped 3 support teams answer tickets faster",
  ])("returns nothing for a strong line: %s", (text) => {
    expect(lintBullet(text)).toEqual([]);
  });

  it.each(["", "   ", "\n\t", "-", "•", "—"])("returns nothing for an empty line %j", (text) => {
    expect(lintBullet(text)).toEqual([]);
  });

  it.each<[string, LintIssueId[]]>([
    ["Responsible for managing the company website", ["weak-start", "no-number"]],
    ["Results-driven team player passionate about clean code", ["stock-phrase", "no-number"]],
    ["Hard-working self-starter with a strong work ethic", ["stock-phrase", "no-number"]],
    ["I built the billing system for 40 clients", ["first-person"]],
    ["We shipped the new app to 2 million users", ["first-person"]],
    ["I helped launch 3 products", ["first-person", "weak-start"]],
    ["Worked on various things", ["weak-start", "no-number", "vague", "too-short"]],
    ["Responsible for various duties", ["weak-start", "no-number", "vague", "too-short"]],
    ["The database was migrated to Postgres in 2022 by the team", ["passive"]],
    ["Legacy jobs were successfully migrated to Airflow in 3 weeks", ["passive"]],
    ["The new API was built by contractors in 6 weeks", ["passive"]],
    ["Assisted with onboarding of 12 new hires", ["weak-start"]],
    ["1. Helped the sales team close 3 deals", ["weak-start"]],
    ["Was responsible for 4 regional offices", ["weak-start"]],
    ["Did data entry for 3 departments", ["weak-start"]],
    ["Participated in 5 hackathons", ["weak-start", "too-short"]],
    ["Duties included answering phones", ["weak-start", "no-number", "too-short"]],
    ["Handled 20 support tickets a day etc.", ["weak-start", "vague"]],
    ["Led several projects for numerous clients", ["no-number", "vague"]],
    ["Thought outside the box to cut costs 10%", ["stock-phrase"]],
    ["Wore many hats at a 10-person startup", ["stock-phrase"]],
    ["Built my first app with 10k downloads", ["first-person"]],
    ["Fixed bugs", ["no-number", "too-short"]],
  ])("%s -> %j", (text, expected) => {
    expect(ids(text)).toEqual(expected);
  });

  it("orders by severity, then by where the match is", () => {
    const issues = lintBullet("Responsible for various duties");
    expect(issues.map((i) => [i.id, i.severity, i.match])).toEqual([
      ["weak-start", "high", "Responsible for"],
      ["no-number", "high", null],
      ["vague", "low", "various"],
      ["too-short", "low", null],
    ]);
    expect(ids("I helped launch 3 products")).toEqual(["first-person", "weak-start"]);
  });

  describe("messages", () => {
    it("names the stock phrase", () => {
      expect(issue("Built APIs as a team player for 3 squads", "stock-phrase")).toEqual({
        id: "stock-phrase",
        severity: "high",
        message: '"team player" is a phrase recruiters skip. Show the result instead.',
        match: "team player",
      });
      expect(
        issue("Results-driven team player passionate about clean code", "stock-phrase")?.message,
      ).toBe(
        '"Results-driven", "team player" and "passionate about" are phrases recruiters skip. Show the result instead.',
      );
    });

    it("names the weak start", () => {
      expect(issue("Responsible for the website", "weak-start")?.message).toBe(
        'Swap "Responsible for" for what you did, like "Built", "Cut" or "Led".',
      );
      expect(issue("Assisted with 4 audits", "weak-start")?.match).toBe("Assisted with");
    });

    it("asks for a number", () => {
      expect(issue("Improved the onboarding flow for new users", "no-number")).toEqual({
        id: "no-number",
        severity: "high",
        message: "Add a number: how many, how much, or how fast?",
        match: null,
      });
    });

    it("treats I and we differently", () => {
      expect(issue("I built 3 apps for clients", "first-person")?.message).toBe(
        'Drop "I". Resume lines leave out I, me and my.',
      );
      expect(issue("We built 3 apps for clients", "first-person")?.message).toBe(
        '"We" hides your part. Say what you did.',
      );
    });

    it("quotes the passive phrase", () => {
      expect(issue("The database was migrated to Postgres in 2022", "passive")).toEqual({
        id: "passive",
        severity: "low",
        message: '"was migrated" hides who did it. Say what you did instead.',
        match: "was migrated",
      });
    });

    it("gives each kind of vague word its own fix", () => {
      expect(issue("Led various projects for 3 clients", "vague")?.message).toBe(
        '"various" is vague. Give the real number.',
      );
      expect(issue("Ran payroll, invoices, etc. for 30 staff", "vague")).toMatchObject({
        match: "etc.",
        message: '"etc." is vague. Name what matters, or cut it.',
      });
      expect(issue("Fixed stuff for 3 teams every week", "vague")?.message).toBe(
        '"stuff" is vague. Say exactly what.',
      );
    });

    it("says how long a long line is", () => {
      const words = `Shipped ${"fast ".repeat(30)}fixes for 3 teams`;
      expect(issue(words, "too-long")?.message).toBe(
        "This line has 35 words. Trim it to two lines so it's easy to skim.",
      );
      const chars = `Rebuilt ${"internationalization ".repeat(11)}tooling for 4 apps`;
      expect(issue(chars, "too-long")?.message).toBe(
        `This line has ${chars.trim().length} characters. Trim it to two lines so it's easy to skim.`,
      );
    });
  });

  describe("length limits", () => {
    const words = (count: number) => `Shipped ${"3 ".repeat(count - 1)}`.trim();

    it("flags more than 32 words or 220 characters", () => {
      expect(ids(words(32))).not.toContain("too-long");
      expect(ids(words(33))).toContain("too-long");
      const at = (length: number) => `Cut ${"x".repeat(length - 7)} 4%`;
      expect(at(220)).toHaveLength(220);
      expect(ids(at(220))).not.toContain("too-long");
      expect(ids(at(221))).toContain("too-long");
    });

    it("flags fewer than 5 words", () => {
      expect(ids(words(4))).toContain("too-short");
      expect(ids(words(5))).not.toContain("too-short");
    });
  });

  describe("first person", () => {
    it.each([
      "In 2021 I led a team of 5",
      "As CTO I built the 4-person data team",
      "i built 3 apps",
      "I'm proud of shipping 3 apps",
      "Led my team of 8 engineers",
      "Our team grew revenue 20%",
      "Grew revenue 20% with our partners",
      "MY TEAM SHIPPED 3 APPS",
    ])("flags %s", (text) => {
      expect(ids(text)).toContain("first-person");
    });

    it.each([
      "Completed Phase I trial analysis for 1,200 patients",
      "Ran Phase-I and Phase II studies across 3 sites",
      "Treated Type I diabetes patients at 2 clinics",
      "Played Division I soccer for 4 years",
      "Taught at a Title I school for 3 years",
      "Wrote 2 articles on World War I history",
      "Designed an I/O scheduler for 12 services",
      "Cut costs by a third, i.e. 20% of spend",
      "Filed 30 I-9 forms per week",
      "Taught Calculus I and II to 120 students",
      "Tutored 40 students in Organic Chemistry I.",
      "Earned a BS in ME in 2019 with honors",
      "Opened 3 offices in MY and SG",
    ])("doesn't flag %s", (text) => {
      expect(ids(text)).not.toContain("first-person");
    });
  });

  describe("numbers", () => {
    it.each([
      "Cut churn by 15% in a quarter",
      "Saved $40K a year on hosting",
      "Raised €2M from angel investors",
      "Grew revenue 3x after the relaunch",
      "Cut onboarding from two weeks to three days",
      "Hired a dozen engineers in a year",
      "Doubled weekly active users after launch",
      "Served thousands of customers every day",
      "Reached zero downtime during the migration",
    ])("counts %s", (text) => {
      expect(ids(text)).not.toContain("no-number");
    });
  });

  describe("passive voice", () => {
    it.each([
      "Mentored 3 developers, two of whom were promoted within a year",
      "Team was based in Berlin with 12 engineers",
      "Revenue was up 40% after the redesign",
      "Grew the team, which was interested in 3 new markets",
      "Wrote lesson plans that were adopted by 12 schools",
    ])("doesn't flag %s", (text) => {
      expect(ids(text)).not.toContain("passive");
    });
  });

  describe("weak starts and vague words", () => {
    it("only flags weak verbs at the start", () => {
      expect(ids("Built tools that helped 3 teams ship faster")).not.toContain("weak-start");
      expect(ids("Led 4 people and was the on-call lead")).not.toContain("weak-start");
    });

    it("leaves hyphenated terms alone", () => {
      expect(lintBullet("Designed a many-to-many schema for 40 tables")).toEqual([]);
      expect(lintBullet("Wrote multiple-choice exams for 300 students")).toEqual([]);
    });

    it("reports each id once, with a match taken from the text", () => {
      const lines = [
        "I helped my team and our partners with various things, stuff, etc.",
        "Responsible for results-driven synergy as a team player and go-getter",
        "We were responsible for many things that were handled by several teams",
      ];
      for (const text of lines) {
        const issues = lintBullet(text);
        expect(new Set(issues.map((i) => i.id)).size).toBe(issues.length);
        for (const { match } of issues) if (match !== null) expect(text).toContain(match);
        const severities = issues.map((i) => i.severity);
        expect(severities).toEqual(
          [...severities].sort((a, b) => (a === b ? 0 : a === "high" ? -1 : 1)),
        );
      }
    });
  });
});

type Sections = { experience?: string[][]; projects?: string[][]; education?: string[][] };

function resume({ experience = [], projects = [], education = [] }: Sections): Resume {
  const bullets = (prefix: string, texts: string[]) =>
    texts.map((text, j) => ({ id: `${prefix}-${j}`, text }));
  return {
    ...emptyResume(0),
    experience: experience.map((texts, i) => ({
      id: `job-${i}`,
      company: "Acme",
      title: "Engineer",
      location: "",
      startDate: "",
      endDate: "",
      bullets: bullets(`e${i}`, texts),
    })),
    projects: projects.map((texts, i) => ({
      id: `project-${i}`,
      name: "Side project",
      link: "",
      bullets: bullets(`p${i}`, texts),
    })),
    education: education.map((texts, i) => ({
      id: `school-${i}`,
      school: "MIT",
      degree: "BSc",
      field: "",
      location: "",
      startDate: "",
      endDate: "",
      bullets: bullets(`d${i}`, texts),
    })),
  };
}

const flagged = (lint: ReturnType<typeof lintResume>) =>
  Object.entries(lint.byBullet)
    .filter(([, issues]) => issues.some((i) => i.id === "duplicate"))
    .map(([id]) => id)
    .sort();

const NATO = "alpha bravo charlie delta echo foxtrot golf hotel india juliet kilo lima mike".split(
  " ",
);
const phrase = (count: number, extra: string[] = []) =>
  [...NATO.slice(0, count), ...extra].join(" ");

describe("lintResume", () => {
  it("lints every bullet in experience, projects and education", () => {
    const lint = lintResume(
      resume({
        experience: [["Cut deploy time 40% with a new CI pipeline", ""]],
        projects: [["Fixed bugs"]],
        education: [["Wrote a thesis on graph theory"]],
      }),
    );
    expect(Object.keys(lint.byBullet).sort()).toEqual(["d0-0", "e0-0", "e0-1", "p0-0"]);
    expect(lint.byBullet["e0-0"]).toEqual([]);
    expect(lint.byBullet["e0-1"]).toEqual([]);
    expect(lint.byBullet["p0-0"]?.map((i) => i.id)).toEqual(["no-number", "too-short"]);
    expect(lint.byBullet["d0-0"]?.map((i) => i.id)).toEqual(["no-number"]);
  });

  it("flags identical lines anywhere in the resume, after normalizing", () => {
    const lint = lintResume(
      resume({
        experience: [["Built a React dashboard, used by 40 reps."], ["Led 3 hiring rounds"]],
        projects: [["built a react dashboard used by 40 reps"]],
      }),
    );
    expect(flagged(lint)).toEqual(["e0-0", "p0-0"]);
    expect(lint.byBullet["e0-0"]?.at(-1)).toEqual({
      id: "duplicate",
      severity: "low",
      message: "This line repeats another one. Keep one, or make each say something new.",
      match: null,
    });
  });

  it("flags identical short lines but not reordered ones", () => {
    expect(
      flagged(lintResume(resume({ experience: [["Built REST APIs", "Built REST APIs"]] }))),
    ).toEqual(["e0-0", "e0-1"]);
    expect(
      flagged(lintResume(resume({ experience: [["Built REST APIs", "REST APIs built"]] }))),
    ).toEqual([]);
    expect(
      flagged(
        lintResume(resume({ experience: [["Built REST APIs fast", "Built fast REST APIs"]] })),
      ),
    ).toEqual(["e0-0", "e0-1"]);
  });

  it.each([
    { a: phrase(13), b: phrase(12, ["zulu"]), duplicate: true }, // 12 / 14 = 0.857
    { a: phrase(12), b: phrase(11, ["zulu"]), duplicate: false }, // 11 / 13 = 0.846
    { a: phrase(6), b: phrase(6, ["zulu"]), duplicate: true }, // 6 / 7 = 0.857
    { a: phrase(5), b: phrase(5, ["zulu"]), duplicate: false }, // 5 / 6 = 0.833
    { a: phrase(4), b: phrase(4), duplicate: true },
  ])("uses a token Jaccard of 0.85: $a / $b", ({ a, b, duplicate }) => {
    const lint = lintResume(resume({ experience: [[a]], projects: [[b]] }));
    expect(flagged(lint)).toEqual(duplicate ? ["e0-0", "p0-0"] : []);
  });

  it("matches a brute-force comparison on a large resume", () => {
    // mulberry32: deterministic, so a failure always reproduces.
    let seed = 7;
    const random = () => {
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
    };
    const pick = <T>(items: readonly T[]): T => items[Math.floor(random() * items.length)] as T;
    const vocabulary =
      "ship build cut grow lead plan test fix data team api user cost time sales web app"
        .split(" ")
        .concat(NATO);
    const bases = Array.from({ length: 40 }, () =>
      Array.from({ length: 3 + Math.floor(random() * 14) }, () => pick(vocabulary)),
    );
    const texts = Array.from({ length: 600 }, () => {
      const words = [...pick(bases)];
      const edits = Math.floor(random() * 3);
      for (let e = 0; e < edits; e++) {
        const at = Math.floor(random() * words.length);
        if (random() < 0.5) words[at] = pick(vocabulary);
        else words.splice(at, 0, pick(vocabulary));
      }
      return words.join(" ");
    });

    const tokens = texts.map((text) => text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []);
    const expected = new Set<number>();
    tokens.forEach((a, i) =>
      tokens.forEach((b, j) => {
        if (i >= j) return;
        const sa = new Set(a);
        const sb = new Set(b);
        const overlap = [...sa].filter((t) => sb.has(t)).length;
        const union = sa.size + sb.size - overlap;
        const same = a.length > 0 && a.join(" ") === b.join(" ");
        const near = a.length >= 4 && b.length >= 4 && overlap * 100 >= union * 85;
        if (same || near) expected.add(i).add(j);
      }),
    );

    const lint = lintResume(resume({ experience: [texts] }));
    const actual = new Set(flagged(lint).map((id) => Number(id.split("-")[1])));
    expect(expected.size).toBeGreaterThan(50);
    expect([...actual].sort((x, y) => x - y)).toEqual([...expected].sort((x, y) => x - y));
  });

  it("counts totals over lines that have words", () => {
    const lint = lintResume(
      resume({
        experience: [
          [
            "Cut deploy time 40% with a new CI pipeline",
            "Responsible for the company website",
            " ",
          ],
        ],
        projects: [["Built a CLI used by 200 developers", "Built a CLI used by 200 developers"]],
        education: [["Dean's list for 4 semesters", "Wrote a thesis on graph theory"]],
      }),
    );
    expect(lint.totals).toEqual({ bullets: 6, withIssues: 4, withNumbers: 4, highSeverity: 2 });
  });

  it("leaves hidden lines, entries and sections out of the issues and totals", () => {
    const base = resume({
      experience: [["Fixed bugs", "Fixed bugs"], ["Helped with stuff"]],
      projects: [["Fixed bugs"]],
    });
    const [first, second] = base.experience;
    if (!first || !second) throw new Error("fixture");
    const lint = lintResume({
      ...base,
      experience: [
        { ...first, bullets: first.bullets.map((b, i) => (i === 1 ? { ...b, hidden: true } : b)) },
        { ...second, hidden: true },
      ],
      hiddenSections: ["projects"],
    });
    expect(Object.keys(lint.byBullet)).toEqual(["e0-0"]);
    // Its twin is hidden, so the line no longer repeats anything on the page.
    expect(lint.byBullet["e0-0"]?.map((i) => i.id)).not.toContain("duplicate");
    expect(lint.totals.bullets).toBe(1);
  });

  it("lints the lines of extra sections", () => {
    const lint = lintResume({
      ...resume({ experience: [["Taught 30 children to code"]] }),
      extras: [
        {
          id: "x",
          kind: "volunteering",
          title: "Volunteering",
          items: [
            {
              id: "x1",
              title: "Mentor",
              subtitle: "Code Club",
              date: "",
              detail: "",
              bullets: [
                { id: "x1-0", text: "Taught 30 children to code" },
                { id: "x1-1", text: "Helped out" },
              ],
            },
          ],
        },
      ],
    });
    expect(flagged(lint)).toEqual(["e0-0", "x1-0"]);
    expect(lint.byBullet["x1-1"]?.map((i) => i.id)).toContain("too-short");
    expect(lint.totals.bullets).toBe(3);
  });

  it("returns empty totals for an empty resume", () => {
    expect(lintResume(emptyResume(0))).toEqual({
      byBullet: {},
      totals: { bullets: 0, withIssues: 0, withNumbers: 0, highSeverity: 0 },
    });
  });

  it("stores odd bullet ids as plain keys", () => {
    const base = resume({ experience: [["Fixed bugs"]] });
    const job = base.experience[0];
    if (!job) throw new Error("fixture");
    const lint = lintResume({
      ...base,
      experience: [{ ...job, bullets: [{ id: "__proto__", text: "Fixed bugs" }] }],
    });
    expect(Object.hasOwn(lint.byBullet, "__proto__")).toBe(true);
    expect(Object.getPrototypeOf(lint.byBullet)).toBe(Object.prototype);
  });

  it("stays fast on a resume at the schema's size limits", () => {
    const verbs = ["Built", "Cut", "Led", "Grew", "Shipped", "Designed", "Reduced", "Launched"];
    const experience = Array.from({ length: 40 }, (_, i) =>
      Array.from({ length: 40 }, (_, j) => {
        const verb = verbs[(i + j) % verbs.length] ?? "Built";
        return `${verb} the ${i}-${j} service for ${j * 7} teams across ${i + 2} regions in 2024`;
      }),
    );
    const started = performance.now();
    const lint = lintResume(resume({ experience }));
    expect(lint.totals.bullets).toBe(1_600);
    // Generous bound: a smoke test for accidental quadratic work, not a benchmark.
    expect(performance.now() - started).toBeLessThan(2_000);
  });
});
