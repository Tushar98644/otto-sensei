import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetEnvForTests } from "@/lib/env";
import { resumeToText } from "@/lib/resume/ops";
import { emptyResume, type Resume } from "@/lib/resume/schema";
import type { StructuredRequest } from "./client";
import { fixBullet } from "./fix";
import { structureResume } from "./structure";
import { tailorResume } from "./tailor";
import type { WritingInput } from "./types";
import { answerQuestion, writeCoverLetter } from "./writing";

const runStructured = vi.hoisted(() =>
  vi.fn<(request: StructuredRequest<unknown>) => Promise<unknown>>(),
);
vi.mock("./client", () => ({ runStructured }));

const NAME = "Priya Natarajan";
const EMAIL = "priya.n@example.com";
const PHONE = "+44 20 7946 0958";
const LINKEDIN = "linkedin.com/in/priyan";
const SITE = "https://priya.dev";
const PROJECT_LINK = "github.com/priyan/ledger";
const STATUS_LINE = "Launched status.priya.dev/uptime for 300 teams";
const NOTES_LINE = "Helped with the launch notes at priya.dev/notes";

const PRIVATE = [NAME, EMAIL, PHONE, "7946", LINKEDIN, "priya.dev", "github.com", "http", "www."];

function makeResume(): Resume {
  return {
    ...emptyResume(0),
    basics: {
      name: NAME,
      headline: "Backend Engineer",
      email: EMAIL,
      phone: PHONE,
      location: "Leeds, UK",
      links: [
        { id: "l1", label: "LinkedIn", url: LINKEDIN },
        { id: "l2", label: "Site", url: SITE },
      ],
    },
    summary: `${NAME} builds payment systems. Reach me at ${EMAIL}.`,
    experience: [
      {
        id: "job-1",
        company: "Mapline",
        title: "Engineer",
        location: "",
        startDate: "2021",
        endDate: "Present",
        bullets: [
          { id: "b1", text: STATUS_LINE },
          { id: "b2", text: "Rebuilt the billing service in Go, cutting p99 latency by 40%" },
          { id: "b3", text: NOTES_LINE },
        ],
      },
    ],
    projects: [{ id: "p1", name: "Ledger", link: PROJECT_LINK, bullets: [] }],
  };
}

const JOB: WritingInput = {
  jobText:
    "Kestrel Labs is hiring a Senior Backend Engineer. You have shipped Go services in production and you care about reliability.",
  jobTitle: "Senior Backend Engineer",
  company: "Kestrel Labs",
};

function sentUser(call = 0): string {
  return runStructured.mock.calls[call]?.[0].user ?? "";
}

function expectPrivate(user: string) {
  expect(user.length).toBeGreaterThan(0);
  for (const value of PRIVATE) expect(user).not.toContain(value);
  expect(user).not.toMatch(/[\w.+-]+@[\w-]+\.\w+/);
}

function placeholderFor(user: string, before: string, after: string): string {
  const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = new RegExp(`${escape(before)}(\\[[A-Z]+_\\d+\\])${escape(after)}`).exec(user);
  if (!match?.[1]) throw new Error(`No placeholder between "${before}" and "${after}"`);
  return match[1];
}

function siteToken(user: string): string {
  const token = user.split("\n")[4]?.split(" | ")[1];
  if (!token) throw new Error("No links line");
  return token;
}

function useKey(key: string | null) {
  if (key) process.env.OPENROUTER_API_KEY = key;
  else delete process.env.OPENROUTER_API_KEY;
  resetEnvForTests();
}

beforeEach(() => {
  useKey("test-key");
  runStructured.mockReset();
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "info").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  useKey(null);
});

describe("import structuring", () => {
  const text = resumeToText(makeResume());

  function copyOf(user: string, overrides: { email?: string; phone?: string } = {}) {
    const lines = user.split("\n");
    const contact = lines[3]?.split(" | ") ?? [];
    const links = lines[4]?.split(" | ") ?? [];
    return {
      basics: {
        name: lines[1] ?? "",
        headline: lines[2] ?? "",
        email: overrides.email ?? contact[0] ?? "",
        phone: overrides.phone ?? contact[1] ?? "",
        location: contact[2] ?? "",
        links: links.map((url) => ({ label: "Link", url })),
      },
      summary: lines.find((line) => line.includes("builds payment systems")) ?? "",
      experience: [
        {
          company: "Mapline",
          title: "Engineer",
          location: "",
          startDate: "2021",
          endDate: "Present",
          bullets: lines.filter((line) => line.startsWith("- ")).map((line) => line.slice(2)),
        },
      ],
      education: [],
      projects: [{ name: "Ledger", link: placeholderFor(user, "Ledger | ", ""), bullets: [] }],
      skills: [],
      certifications: [],
      extras: [],
    };
  }

  it("sends no name, email, phone or link", async () => {
    runStructured.mockImplementationOnce(async (request) => copyOf(request.user));
    await structureResume(text, 0);
    expectPrivate(sentUser());
    expect(sentUser()).toContain("<resume>\n[NAME]\nBackend Engineer\n[EMAIL_1] | [PHONE_1] | Leeds, UK\n");
  });

  it("puts the file's own contact details and links back, exactly", async () => {
    runStructured.mockImplementationOnce(async (request) => copyOf(request.user));
    const { resume, usedAI } = await structureResume(text, 0);
    expect(usedAI).toBe(true);
    expect(resume.basics).toMatchObject({
      name: NAME,
      email: EMAIL,
      phone: PHONE,
      location: "Leeds, UK",
      links: [
        { label: "LinkedIn", url: LINKEDIN },
        { label: "Website", url: SITE },
      ],
    });
    expect(resume.summary).toBe(`${NAME} builds payment systems. Reach me at ${EMAIL}.`);
    expect(resume.experience[0]?.bullets.map((bullet) => bullet.text)).toEqual([
      STATUS_LINE,
      "Rebuilt the billing service in Go, cutting p99 latency by 40%",
      NOTES_LINE,
    ]);
    expect(resume.projects[0]?.link).toBe(PROJECT_LINK);
  });

  it("fills an email or phone the model dropped from what the file says", async () => {
    runStructured.mockImplementationOnce(async (request) =>
      copyOf(request.user, { email: "", phone: "" }),
    );
    const { resume, usedAI } = await structureResume(text, 0);
    expect(usedAI).toBe(true);
    expect(resume.basics).toMatchObject({ email: EMAIL, phone: PHONE });
  });

  it("keeps a project's link out of the profile links when the file has it once", async () => {
    runStructured.mockImplementationOnce(async (request) => {
      const copy = copyOf(request.user);
      const project = copy.projects[0]?.link ?? "";
      return { ...copy, basics: { ...copy.basics, links: [...copy.basics.links, { label: "Portfolio", url: project }] } };
    });
    const { resume } = await structureResume(text, 0);
    expect(resume.basics.links.map((link) => link.url)).toEqual([LINKEDIN, SITE]);
    expect(resume.projects[0]?.link).toBe(PROJECT_LINK);
  });

  it("drops placeholders the model made up", async () => {
    runStructured.mockImplementationOnce(async (request) => ({
      ...copyOf(request.user),
      summary: "[NAME] builds payment systems. Reach me at [EMAIL_1]. [LINK_9]",
    }));
    const { resume } = await structureResume(text, 0);
    expect(resume.summary).toBe(`${NAME} builds payment systems. Reach me at ${EMAIL}.`);
  });

  it("still rejects a rewritten resume", async () => {
    runStructured.mockImplementationOnce(async (request) => ({
      ...copyOf(request.user),
      summary: "Visionary technologist spearheading transformative fintech initiatives worldwide.",
      experience: [
        {
          company: "Mapline",
          title: "Engineer",
          location: "",
          startDate: "2021",
          endDate: "Present",
          bullets: ["Spearheaded a revolutionary platform transformation across continents"],
        },
      ],
    }));
    const { usedAI, resume } = await structureResume(text, 0);
    expect(usedAI).toBe(false);
    expect(resume.basics.email).toBe(EMAIL);
  });
});

describe("line fixes", () => {
  const role = { title: "Engineer", company: "Mapline" };

  it("sends the line without its link and restores it in the suggestion", async () => {
    runStructured.mockImplementationOnce(async (request) => ({
      issues: ["No result: what changed for those teams?"],
      questions: [],
      suggestion: `Launched ${placeholderFor(request.user, "Launched ", " for 300 teams")} for 300 teams, serving about 1,200 users a day`,
    }));
    const result = await fixBullet({
      bullet: STATUS_LINE,
      role,
      answers: [{ question: "How many users?", answer: "About 1,200 a day, see priya.dev/stats" }],
    });
    expectPrivate(sentUser());
    expect(result.suggestion).toBe(
      "Launched status.priya.dev/uptime for 300 teams, serving about 1,200 users a day",
    );
  });

  it("still masks a number the line and answers don't contain", async () => {
    runStructured.mockResolvedValueOnce({
      issues: [],
      questions: [],
      suggestion: "Launched [LINK_1] for 450 teams",
    });
    const result = await fixBullet({ bullet: STATUS_LINE, role, answers: [] });
    expect(result.suggestion).toBe("Launched status.priya.dev/uptime for [number] teams");
  });
});

describe("tailoring", () => {
  function output(user: string, summary: string) {
    const status = placeholderFor(user, '"text":"Launched ', ' for 300 teams"');
    return {
      jobTitle: "Senior Backend Engineer",
      company: "Kestrel Labs",
      requirements: [
        { text: "Go in production", importance: "must", source: "wording", terms: ["Go"], quote: "", ask: "Have you used Go?" },
        {
          text: "Run status pages",
          importance: "nice",
          source: "structure",
          terms: [],
          quote: `Launched ${status} for 300 teams`,
          ask: "Have you run a status page?",
        },
      ],
      bulletOrder: [{ experienceId: "e1", bulletIds: ["b2", "b1", "b3"] }],
      summary,
      notes: [`Say what ${status} measured.`],
    };
  }

  it("sends no personal details and restores them in the result", async () => {
    runStructured.mockImplementationOnce(async (request) =>
      output(request.user, "[NAME] rebuilt the billing service in Go, cutting p99 latency by 40%."),
    );
    const result = await tailorResume(makeResume(), { ...JOB });
    expectPrivate(sentUser());
    expect(result.summary).toBe(`${NAME} rebuilt the billing service in Go, cutting p99 latency by 40%.`);
    expect(result.requirements[1]?.quote).toBe(STATUS_LINE);
    expect(result.notes).toEqual(["Say what status.priya.dev/uptime measured."]);
    expect(result.bulletOrder).toEqual([{ experienceId: "job-1", bulletIds: ["b2", "b1", "b3"] }]);
  });

  it("still drops a summary with a number the resume doesn't have", async () => {
    runStructured.mockImplementationOnce(async (request) => output(request.user, "[NAME] led 12 teams."));
    const result = await tailorResume(makeResume(), { ...JOB });
    expect(result.summary).toBe("");
  });
});

describe("cover letters and answers", () => {
  const LETTER = [
    "I'm applying for the Senior Backend Engineer role at Kestrel Labs. At Mapline I rebuilt the billing service in Go, cutting p99 latency by 40%.",
    "I keep services small and easy to reason about, and I write notes the next person can act on without asking me first. Most weeks are quiet, and when they aren't, those notes make the next incident shorter.",
    "Your post talks about Go services in production, which is the work I like most. You can reach me at [PHONE_1], and I'd be glad to talk about the role.",
  ];

  it("sends no personal details, and phone digits put back count as the resume's own", async () => {
    runStructured.mockResolvedValueOnce({ paragraphs: LETTER });
    const result = await writeCoverLetter(makeResume(), JOB);
    expectPrivate(sentUser());
    expect(runStructured).toHaveBeenCalledTimes(1);
    expect(result.letter).toContain(`You can reach me at ${PHONE}, and`);
    expect(result.letter).not.toContain("[number]");
    expect(result.letter.endsWith(`Best regards,\n${NAME}`)).toBe(true);
    expect(result.warnings).toEqual([]);
  });

  it("puts the name back only where the model used it", async () => {
    runStructured.mockResolvedValueOnce({
      paragraphs: [...LETTER.slice(0, 2), "[NAME] would be glad to talk about the role."],
    });
    const result = await writeCoverLetter(makeResume(), JOB);
    expect(result.letter).toContain(`\n\n${NAME} would be glad to talk about the role.\n\n`);
    expect(result.letter.match(new RegExp(NAME, "g"))).toHaveLength(2);
  });

  it("keeps the retry notes free of personal details", async () => {
    runStructured
      .mockImplementationOnce(async (request) => ({
        paragraphs: [
          `I wrote the launch notes at ${placeholderFor(request.user, "Helped with the launch notes at ", "\n")}.`,
          ...LETTER.slice(1),
        ],
      }))
      .mockResolvedValueOnce({ paragraphs: LETTER });
    await writeCoverLetter(makeResume(), JOB);
    expect(runStructured).toHaveBeenCalledTimes(2);
    expectPrivate(sentUser(1));
    expect(sentUser(1)).toMatch(/You wrote "wrote", but the resume line says: "Helped with the launch notes at \[LINK_\d+\]"/);
  });

  it("still masks invented numbers next to restored links", async () => {
    runStructured.mockImplementation(async (request) => ({
      paragraphs: [`${LETTER[0]} I served 9,999 teams at ${siteToken(request.user)}.`, ...LETTER.slice(1)],
    }));
    const result = await writeCoverLetter(makeResume(), JOB);
    expect(runStructured).toHaveBeenCalledTimes(2);
    expect(result.letter).toContain(`I served [number] teams at ${SITE}.`);
    expect(result.warnings[0]).toContain("Fill in [number]");
  });

  it("answers a question without sending personal details", async () => {
    runStructured.mockImplementationOnce(async (request) => ({
      answer: `I want to build Go services like the billing rebuild at Mapline, where I cut p99 latency by 40%. My work is at ${siteToken(request.user)}.`,
    }));
    const result = await answerQuestion(makeResume(), JOB, "Why Kestrel Labs? Share a link to your work.");
    expectPrivate(sentUser());
    expect(result.answer).toContain(`My work is at ${SITE}.`);
  });
});
