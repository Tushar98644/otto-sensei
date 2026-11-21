import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { modelFor } from "@/lib/ai/client";
import type { StructureResult } from "@/lib/ai/structure";
import { resetEnvForTests } from "@/lib/env";
import type { Grade } from "@/lib/evals/graders";
import { dryRun, estimateCase, gradeOutput, validateSuite } from "../../../scripts/evals/harness";
import {
  readResume,
  structureSuite,
  type StructureCase,
} from "../../../scripts/evals/suites/structure";
import { STRUCTURE_CASES } from "../../../scripts/evals/suites/structure/cases";
import {
  copiedTexts,
  dice,
  leftOutGrade,
  overallGrade,
  plain,
  resumeOf,
  scoreRead,
  scoreSection,
  sectionGrades,
  type ReadResume,
} from "../../../scripts/evals/suites/structure/graders";

const NOW = Date.UTC(2026, 10, 1);
const CASES = structureSuite.cases as readonly StructureCase[];

function caseOf(id: string): StructureCase {
  const found = CASES.find((kase) => kase.id === id);
  if (!found) throw new Error(`no case ${id}`);
  return found;
}

function readFor(id: string): ReadResume {
  const read = caseOf(id).expect?.read;
  if (!read) throw new Error(`case ${id} has no expected read`);
  return read;
}

const EMPTY: ReadResume = {
  basics: { name: "", headline: "", email: "", phone: "", location: "", links: [] },
  summary: "",
  experience: [],
  education: [],
  projects: [],
  skills: [],
  certifications: [],
  extras: [],
};

const output = (read: ReadResume): StructureResult => ({
  resume: resumeOf(read, NOW),
  usedAI: true,
});

function gradesFor(id: string, read: ReadResume): Grade[] {
  return gradeOutput(structureSuite, output(read), caseOf(id));
}

const named = (grades: readonly Grade[], name: string) =>
  grades.find((grade) => grade.name === name);
const failing = (grades: readonly Grade[]) =>
  grades.filter((grade) => !grade.pass).map((grade) => grade.name);

const classic = () => readFor("software-engineer-classic");

describe("structure suite", () => {
  it("is valid, and every golden passes every check", () => {
    expect(validateSuite(structureSuite)).toEqual([]);
    const [checked] = dryRun([structureSuite]);
    expect(checked?.problems).toEqual([]);
    expect(checked?.cases.every((kase) => kase.grades !== null)).toBe(true);
  });

  it("has 15 to 25 cases, from a bare minimum to a very long career and a job post", () => {
    expect(CASES.length).toBeGreaterThanOrEqual(15);
    expect(CASES.length).toBeLessThanOrEqual(25);
    const lengths = CASES.map((kase) => kase.input.text.length);
    expect(Math.min(...lengths)).toBeLessThan(120);
    expect(caseOf("long-senior-career").input.text.length).toBeGreaterThan(12_000);
    expect(caseOf("job-post-not-resume").expect?.read).toBeNull();
  });

  it("copies every expected value from its own case's text", () => {
    for (const data of STRUCTURE_CASES) {
      if (!data.read) continue;
      const text = plain(data.text);
      const values = [
        ...copiedTexts(data.read),
        ...data.read.extras.map((section) => section.title),
      ];
      const missing = values.filter((value) => !text.includes(plain(value)));
      expect(missing, data.id).toEqual([]);
      for (const phrase of data.leftOut ?? []) expect(text, data.id).toContain(plain(phrase));
    }
  });

  it("estimates more tokens for longer text, with room for the prompt and schema", () => {
    const short = estimateCase(structureSuite, caseOf("bare-minimum"));
    const long = estimateCase(structureSuite, caseOf("long-senior-career"));
    expect(short.calls).toBe(1);
    expect(short.inputTokens).toBeGreaterThan(2_000);
    expect(long.inputTokens).toBeGreaterThan(short.inputTokens + 2_500);
    expect(long.outputTokens).toBeGreaterThan(short.outputTokens + 4_000);
  });

  it("shows the judge the read as plain lines, or says that nothing was read", () => {
    const shown =
      structureSuite.judgeOutput?.(output(classic()), caseOf("software-engineer-classic")) ?? "";
    expect(shown).toContain('Job: title "Software Engineer II" | company "Brightwell Outfitters"');
    expect(shown).toContain("Skills (Languages): Go, Python, TypeScript, SQL");
    const fallback = { resume: resumeOf(EMPTY, NOW), usedAI: false };
    expect(structureSuite.judgeOutput?.(fallback, caseOf("job-post-not-resume"))).toMatch(
      /returned nothing usable/,
    );
    expect(structureSuite.judgeInput?.(caseOf("bare-minimum"))).toBe(
      caseOf("bare-minimum").input.text,
    );
  });
});

describe("structure suite against the real structureResume, with a faked OpenRouter", () => {
  type Sent = { model: string; user: string; effort: unknown };

  function fakeReader(reply: (user: string) => unknown): Sent[] {
    const sent: Sent[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
        const body = JSON.parse(String(init?.body)) as {
          model: string;
          messages: { content: unknown }[];
          reasoning?: { effort?: string };
        };
        const user = String(body.messages.at(-1)?.content ?? "");
        sent.push({ model: body.model, user, effort: body.reasoning?.effort });
        const answer = reply(user);
        return Response.json({
          choices: [
            {
              finish_reason: "stop",
              message: { content: typeof answer === "string" ? answer : JSON.stringify(answer) },
            },
          ],
          usage: { prompt_tokens: 100, completion_tokens: 100 },
        });
      }),
    );
    return sent;
  }

  beforeEach(() => {
    process.env.OPENROUTER_API_KEY = "test-key";
    resetEnvForTests();
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "info").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    delete process.env.OPENROUTER_API_KEY;
    resetEnvForTests();
  });

  it("passes every check on every case when the model returns exactly the expected fields", async () => {
    for (const kase of CASES) {
      fakeReader(() => kase.expect?.read ?? EMPTY);
      const result = await readResume(kase);
      expect(result.usedAI, kase.id).toBe(kase.expect?.read !== null);
      const grades = gradeOutput(structureSuite, result, kase);
      expect(failing(grades), kase.id).toEqual([]);
      const decisive = kase.expect?.read === null ? "not-a-resume" : "fields";
      expect(named(grades, decisive)?.pass, kase.id).toBe(true);
    }
  });

  it("sends the redacted text to the structure model at low effort, as the import route does", async () => {
    const sent = fakeReader(() => classic());
    await readResume(caseOf("software-engineer-classic"));
    expect(sent).toHaveLength(1);
    expect(sent[0]?.model).toBe(modelFor("structure"));
    expect(sent[0]?.effort).toBe("low");
    expect(sent[0]?.user).toContain("<resume>");
    expect(sent[0]?.user).toContain("Brightwell Outfitters");
    expect(sent[0]?.user).not.toContain("mara.quill@example.com");
  });

  it("fails not-a-resume when a job post is read as someone's resume", async () => {
    const kase = caseOf("job-post-not-resume");
    fakeReader(() => ({
      ...EMPTY,
      experience: [
        {
          company: "Hollander & Wick",
          title: "Assistant Store Manager",
          location: "Rotterdam",
          startDate: "",
          endDate: "",
          bullets: ["Open and close the store and run morning briefings"],
        },
      ],
    }));
    const result = await readResume(kase);
    expect(result.usedAI).toBe(true);
    expect(named(gradeOutput(structureSuite, result, kase), "not-a-resume")).toMatchObject({
      pass: false,
      detail: expect.stringContaining("1 jobs"),
    });
  });

  it("is an error naming the reason when the app falls back to its rule-based read", async () => {
    fakeReader(() => "not json");
    await expect(readResume(caseOf("software-engineer-classic"))).rejects.toThrow(
      /^fell back to the rule-based read \(.*structure_fallback=invalid_output\)$/,
    );

    const rewritten = {
      ...classic(),
      experience: classic().experience.map((job) => ({
        ...job,
        bullets: job.bullets.map(
          () => "Spearheaded transformative synergies delivering unparalleled stakeholder outcomes",
        ),
      })),
    };
    fakeReader(() => rewritten);
    await expect(readResume(caseOf("software-engineer-classic"))).rejects.toThrow(
      /structure_rejected=unfaithful/,
    );

    fakeReader(() => EMPTY);
    await expect(readResume(caseOf("bare-minimum"))).rejects.toThrow(/structure_rejected=empty/);

    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({ error: { message: "No endpoints found" } }, { status: 404 }),
      ),
    );
    await expect(readResume(caseOf("bare-minimum"))).rejects.toThrow(
      /\(no_route, structure_fallback=unavailable\)/,
    );
  });
});

describe("structure field graders", () => {
  it("scores a perfect read 1 in every section", () => {
    const scores = scoreRead(classic(), classic());
    expect(overallGrade(scores)).toMatchObject({
      pass: true,
      detail: expect.stringMatching(/^F1 1\.00/),
    });
    expect(scores.flatMap(sectionGrades).every((grade) => grade.pass)).toBe(true);
  });

  it("tolerates one dropped bullet out of sixteen experience fields, not two, and names them", () => {
    const [first, second] = classic().experience;
    const oneDropped = {
      ...classic(),
      experience: [{ ...first!, bullets: first!.bullets.slice(0, 2) }, second!],
    };
    expect(
      named(gradesFor("software-engineer-classic", oneDropped), "experience-recall"),
    ).toMatchObject({
      pass: true,
      detail: expect.stringContaining("15/16"),
    });

    const twoDropped = {
      ...classic(),
      experience: [{ ...first!, bullets: first!.bullets.slice(0, 1) }, second!],
    };
    const grade = named(gradesFor("software-engineer-classic", twoDropped), "experience-recall");
    expect(grade?.pass).toBe(false);
    expect(grade?.detail).toContain(
      'missing: experience[Brightwell Outfitters].bullet "Cut nightly invoice',
    );
    expect(
      named(gradesFor("software-engineer-classic", twoDropped), "experience-precision")?.pass,
    ).toBe(true);
  });

  it("counts an invented job against precision only", () => {
    const invented = {
      ...classic(),
      experience: [
        ...classic().experience,
        {
          company: "Ferncliff Telecom",
          title: "Intern",
          location: "",
          startDate: "2018",
          endDate: "2019",
          bullets: ["Fixed printers"],
        },
      ],
    };
    const grades = gradesFor("software-engineer-classic", invented);
    expect(named(grades, "experience-precision")).toMatchObject({
      pass: false,
      detail: expect.stringContaining('experience[Ferncliff Telecom].company "Ferncliff Telecom"'),
    });
    expect(named(grades, "experience-recall")?.pass).toBe(true);
  });

  it("matches entries by content, not by their order", () => {
    const reversed = { ...classic(), experience: [...classic().experience].reverse() };
    expect(scoreSection("experience", classic(), reversed)).toMatchObject({ found: 16, right: 16 });
  });

  it("treats swapped dates as wrong, and a lone date as right on either side", () => {
    const swapped = {
      ...classic(),
      experience: classic().experience.map((job) => ({
        ...job,
        startDate: job.endDate,
        endDate: job.startDate,
      })),
    };
    expect(scoreSection("experience", classic(), swapped)).toMatchObject({
      expected: 16,
      found: 12,
    });

    const nurse = readFor("registered-nurse-licenses");
    const startInstead = {
      ...nurse,
      education: nurse.education.map((entry) => ({
        ...entry,
        startDate: entry.endDate,
        endDate: "",
      })),
    };
    expect(scoreSection("education", nurse, startInstead)).toMatchObject({ found: 3, right: 3 });
  });

  it("accepts a degree and field split either way, and copying differences in case, dashes and end periods", () => {
    const nurse = readFor("registered-nurse-licenses");
    const joined = {
      ...nurse,
      basics: { ...nurse.basics, headline: "REGISTERED NURSE - MEDICAL-SURGICAL" },
      education: nurse.education.map((entry) => ({
        ...entry,
        degree: "Bachelor of Science in Nursing",
        field: "",
      })),
      experience: nurse.experience.map((job) => ({
        ...job,
        bullets: job.bullets.map((bullet) => `${bullet}.`),
      })),
    };
    expect(failing(sectionGrades(scoreSection("education", nurse, joined)))).toEqual([]);
    expect(failing(sectionGrades(scoreSection("experience", nurse, joined)))).toEqual([]);
    expect(failing(sectionGrades(scoreSection("basics", nurse, joined)))).toEqual([]);
  });

  it("matches phones by digits and links without scheme, www or a trailing slash", () => {
    const reformatted = {
      ...classic(),
      basics: {
        ...classic().basics,
        phone: "+1 (555) 014-2290",
        links: [
          { label: "LinkedIn", url: "https://www.linkedin.com/in/mara-quill-dev/" },
          { label: "GitHub", url: "github.com/maraquill-code" },
        ],
      },
    };
    expect(scoreSection("basics", classic(), reformatted)).toMatchObject({
      expected: 7,
      found: 7,
      right: 7,
    });
  });

  it("does not let a rewritten bullet or summary pass as copied", () => {
    expect(dice("Built the order history API in Go", "Built the order history API in Go.")).toBe(1);
    const reworded = {
      ...classic(),
      summary: "Seasoned backend developer focused on subscription billing platforms.",
    };
    expect(scoreSection("summary", classic(), reworded)).toMatchObject({ found: 0, right: 0 });
  });

  it("catches spoken languages read as skills", () => {
    const chef = readFor("sous-chef-spoken-languages");
    const misplaced = {
      ...chef,
      skills: [{ label: "Languages", items: ["Spanish", "English", "Italian"] }],
      extras: chef.extras.filter((section) => section.kind !== "languages"),
    };
    const grades = gradesFor("sous-chef-spoken-languages", misplaced);
    expect(named(grades, "skills-precision")?.pass).toBe(false);
    expect(named(grades, "extras-recall")?.pass).toBe(false);
  });

  it("accepts extra-section items split or joined differently, but not words the resume lacks", () => {
    const chef = readFor("sous-chef-spoken-languages");
    const item = (title: string) => ({ title, subtitle: "", date: "", detail: "", bullets: [] });
    const resplit = {
      ...chef,
      extras: [
        {
          kind: "languages" as const,
          title: "Languages",
          items: [item("Spanish — native, English — fluent, Italian — basic")],
        },
        {
          kind: "custom" as const,
          title: "Interests",
          items: [item("Foraging"), item("sourdough baking"), item("trail running")],
        },
      ],
    };
    expect(failing(sectionGrades(scoreSection("extras", chef, resplit)))).toEqual([]);

    const padded = {
      ...chef,
      extras: [
        ...resplit.extras,
        {
          kind: "awards" as const,
          title: "Awards",
          items: [item("Best New Chef, City Food Prize")],
        },
      ],
    };
    expect(
      named(sectionGrades(scoreSection("extras", chef, padded)), "extras-precision")?.pass,
    ).toBe(false);
  });

  it("ignores a generic Skills label but counts the resume's own group labels", () => {
    const bare = readFor("bare-minimum");
    const labeled = {
      ...bare,
      skills: bare.skills.map((group) => ({ ...group, label: "Skills" })),
    };
    expect(scoreSection("skills", bare, labeled)).toMatchObject({
      expected: 3,
      actual: 3,
      found: 3,
    });

    const unlabeled = {
      ...classic(),
      skills: classic().skills.map((group) => ({ ...group, label: "" })),
    };
    expect(scoreSection("skills", classic(), unlabeled)).toMatchObject({ expected: 11, found: 9 });
  });

  it("gives recall only, and F1 0, when nothing was read", () => {
    const grades = scoreRead(classic(), EMPTY).flatMap(sectionGrades);
    expect(grades.some((grade) => grade.name.endsWith("-precision"))).toBe(false);
    expect(grades.every((grade) => !grade.pass)).toBe(true);
    expect(overallGrade(scoreRead(classic(), EMPTY))).toMatchObject({
      pass: false,
      detail: expect.stringMatching(/^F1 0\.00/),
    });
  });

  it("flags lines that should have been left out", () => {
    const planner = readFor("personal-details-and-footers");
    const leftOut = ["Date of birth", "Page 1 of 2"];
    expect(leftOutGrade(planner, leftOut).pass).toBe(true);
    const kept = {
      ...planner,
      extras: [
        ...planner.extras,
        {
          kind: "custom" as const,
          title: "Personal details",
          items: [
            {
              title: "Date of birth",
              subtitle: "",
              date: "14 March 1991",
              detail: "",
              bullets: [],
            },
          ],
        },
      ],
    };
    expect(leftOutGrade(kept, leftOut)).toMatchObject({
      pass: false,
      detail: 'kept "Date of birth"',
    });
    expect(named(gradesFor("personal-details-and-footers", kept), "left-out")?.pass).toBe(false);
  });

  it("flags invented numbers and new wording in what was read", () => {
    const [first, second] = classic().experience;
    const padded = {
      ...classic(),
      experience: [
        {
          ...first!,
          bullets: [
            ...first!.bullets.slice(0, 2),
            "Mentor two junior engineers, raising their output by 45%",
          ],
        },
        second!,
      ],
    };
    expect(named(gradesFor("software-engineer-classic", padded), "invented-numbers")?.pass).toBe(
      false,
    );

    const polished = {
      ...classic(),
      summary:
        "Visionary, results-driven, passionate engineering powerhouse delivering world-class scalable cloud-native excellence.",
    };
    expect(named(gradesFor("software-engineer-classic", polished), "novel-words")?.pass).toBe(
      false,
    );
  });

  it("grades a declined job post on not-a-resume only, skipping checks of the rules read", () => {
    const kase = caseOf("job-post-not-resume");
    const declined = { resume: resumeOf(EMPTY, NOW), usedAI: false };
    expect(gradeOutput(structureSuite, declined, kase).map((grade) => grade.name)).toEqual([
      "schema",
      "not-a-resume",
    ]);
  });
});
