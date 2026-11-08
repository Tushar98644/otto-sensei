import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TEXT_LIMITS } from "@/config/plans";
import { resetEnvForTests } from "@/lib/env";
import { heuristicParse } from "@/lib/resume/heuristic-parse";
import { DEFAULT_SECTION_ORDER, ResumeSchema, type Resume } from "@/lib/resume/schema";
import { jsonSchemaFor, type StructuredRequest } from "./client";
import { structureResume } from "./structure";
import { AIError } from "./types";

const runStructured = vi.hoisted(() =>
  vi.fn<(request: StructuredRequest<unknown>) => Promise<unknown>>(),
);
vi.mock("./client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./client")>()),
  runStructured,
}));
vi.mock("@/lib/resume/heuristic-parse", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/resume/heuristic-parse")>();
  return { heuristicParse: vi.fn(actual.heuristicParse) };
});

const NOW = 1_700_000_000_000;

const TEXT = `Jane Doe
Backend Engineer
jane@example.com | +1 555 010 2000 | Berlin, Germany | linkedin.com/in/janedoe

Summary
Backend engineer who ships reliable payment systems.

Experience
Senior Engineer, Acme Payments, Berlin   Jan 2021 - Present
• Built the payments API used by 2 million customers
• Cut checkout errors by 40% with better retries

Education
BSc Computer Science, Tech University, 2016 - 2020

Skills
Languages: TypeScript, Go
Tools: Docker, Kafka`;

type Parsed = {
  basics: {
    name: string;
    headline: string;
    email: string;
    phone: string;
    location: string;
    links: { label: string; url: string }[];
  };
  summary: string;
  experience: {
    company: string;
    title: string;
    location: string;
    startDate: string;
    endDate: string;
    bullets: string[];
  }[];
  education: {
    school: string;
    degree: string;
    field: string;
    location: string;
    startDate: string;
    endDate: string;
    bullets: string[];
  }[];
  projects: { name: string; link: string; bullets: string[] }[];
  skills: { label: string; items: string[] }[];
  certifications: { name: string; issuer: string; date: string }[];
  extras: {
    kind: "languages" | "awards" | "volunteering" | "publications" | "custom";
    title: string;
    items: { title: string; subtitle: string; date: string; detail: string; bullets: string[] }[];
  }[];
};

function parsedJane(): Parsed {
  return {
    basics: {
      name: "Jane Doe",
      headline: "Backend Engineer",
      email: "jane@example.com",
      phone: "+1 555 010 2000",
      location: "Berlin, Germany",
      links: [{ label: "LinkedIn", url: "linkedin.com/in/janedoe" }],
    },
    summary: "Backend engineer who ships reliable payment systems.",
    experience: [
      {
        company: "Acme Payments",
        title: "Senior Engineer",
        location: "Berlin",
        startDate: "Jan 2021",
        endDate: "Present",
        bullets: [
          "• Built the payments API used by 2 million customers",
          "Cut checkout errors by 40% with better retries",
          "  ",
        ],
      },
      { company: "", title: "", location: "", startDate: "", endDate: "", bullets: [] },
    ],
    education: [
      {
        school: "Tech University",
        degree: "BSc",
        field: "Computer Science",
        location: "",
        startDate: "2016",
        endDate: "2020",
        bullets: [],
      },
    ],
    projects: [],
    skills: [
      { label: "Languages", items: ["TypeScript", "Go", ""] },
      { label: "Tools", items: ["Docker", "Kafka"] },
      { label: "Empty", items: [""] },
    ],
    certifications: [{ name: "", issuer: "", date: "" }],
    extras: [],
  };
}

function emptyParsed(): Parsed {
  return {
    basics: { name: "", headline: "", email: "", phone: "", location: "", links: [] },
    summary: "",
    experience: [],
    education: [],
    projects: [],
    skills: [],
    certifications: [],
    extras: [],
  };
}

function allIds(resume: Resume): string[] {
  return [
    resume.id,
    ...resume.basics.links.map((link) => link.id),
    ...resume.experience.flatMap((job) => [job.id, ...job.bullets.map((bullet) => bullet.id)]),
    ...resume.education.flatMap((school) => [
      school.id,
      ...school.bullets.map((bullet) => bullet.id),
    ]),
    ...resume.projects.flatMap((project) => [
      project.id,
      ...project.bullets.map((bullet) => bullet.id),
    ]),
    ...resume.skills.map((group) => group.id),
    ...resume.certifications.map((cert) => cert.id),
    ...(resume.extras ?? []).flatMap((section) => [
      section.id,
      ...section.items.flatMap((item) => [item.id, ...item.bullets.map((bullet) => bullet.id)]),
    ]),
  ];
}

function useKey(key: string | null) {
  if (key) process.env.OPENROUTER_API_KEY = key;
  else delete process.env.OPENROUTER_API_KEY;
  resetEnvForTests();
}

beforeEach(() => {
  useKey("test-key");
  runStructured.mockReset();
  vi.mocked(heuristicParse).mockClear();
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  useKey(null);
});

describe("structureResume without the AI", () => {
  it("uses the rule-based parser when there is no API key", async () => {
    useKey(null);
    const result = await structureResume(TEXT, NOW);
    expect(result.usedAI).toBe(false);
    expect(heuristicParse).toHaveBeenCalledWith(TEXT, NOW);
    expect(runStructured).not.toHaveBeenCalled();
    expect(result.resume.basics.name).toBe("Jane Doe");
  });

  it("doesn't pay for a call when there is next to no text", async () => {
    const result = await structureResume("  \n Page 1 \n", NOW);
    expect(result.usedAI).toBe(false);
    expect(runStructured).not.toHaveBeenCalled();
  });

  it("rejects text over the limit, with or without a key", async () => {
    const long = "a".repeat(TEXT_LIMITS.resumeChars + 1);
    await expect(structureResume(long, NOW)).rejects.toMatchObject({ code: "too_long" });
    useKey(null);
    await expect(structureResume(long, NOW)).rejects.toBeInstanceOf(AIError);
    expect(runStructured).not.toHaveBeenCalled();
  });
});

describe("structureResume with the AI", () => {
  it("sends the text as data with low effort and a schema the SDK accepts", async () => {
    runStructured.mockResolvedValueOnce(parsedJane());
    await structureResume(TEXT, NOW);
    const sent = runStructured.mock.calls[0]?.[0];
    expect(sent).toMatchObject({ task: "structure", effort: "low" });
    const shown = TEXT.replace("Jane Doe", "[NAME]").replace(
      "jane@example.com | +1 555 010 2000 | Berlin, Germany | linkedin.com/in/janedoe",
      "[EMAIL_1] | [PHONE_1] | Berlin, Germany | [LINK_1]",
    );
    expect(sent?.user).toBe(`<resume>\n${shown}\n</resume>`);
    expect(sent?.system).toContain("Copy text exactly as written");
    const schema = sent ? jsonSchemaFor(sent.schema) : null;
    expect(schema).toMatchObject({ type: "object", additionalProperties: false });
    expect(sent?.schema.safeParse(parsedJane()).success).toBe(true);
  });

  it("converts the result into a valid resume with fresh ids", async () => {
    runStructured.mockResolvedValueOnce(parsedJane());
    const { resume, usedAI } = await structureResume(TEXT, NOW);
    expect(usedAI).toBe(true);
    expect(ResumeSchema.safeParse(resume).success).toBe(true);
    expect(resume).toMatchObject({
      title: "Imported resume",
      source: "import",
      tailor: null,
      createdAt: NOW,
      updatedAt: NOW,
      sectionOrder: DEFAULT_SECTION_ORDER,
      basics: { name: "Jane Doe", links: [{ label: "LinkedIn", url: "linkedin.com/in/janedoe" }] },
    });
    const ids = allIds(resume);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every((id) => id.length > 0)).toBe(true);
  });

  it("drops bullet symbols, blank lines and empty entries", async () => {
    runStructured.mockResolvedValueOnce(parsedJane());
    const { resume } = await structureResume(TEXT, NOW);
    expect(resume.experience).toHaveLength(1);
    expect(resume.experience[0]?.bullets.map((bullet) => bullet.text)).toEqual([
      "Built the payments API used by 2 million customers",
      "Cut checkout errors by 40% with better retries",
    ]);
    expect(resume.skills.map((group) => [group.label, group.items])).toEqual([
      ["Languages", ["TypeScript", "Go"]],
      ["Tools", ["Docker", "Kafka"]],
    ]);
    expect(resume.certifications).toEqual([]);
  });

  it("clips every string and list to the schema caps", async () => {
    const word = "lorem ";
    const bullets = Array.from({ length: 45 }, () => word.repeat(300));
    const parsed: Parsed = {
      basics: {
        name: word.repeat(100),
        headline: word.repeat(100),
        email: word.repeat(100),
        phone: word.repeat(20),
        location: word.repeat(100),
        links: Array.from({ length: 12 }, () => ({
          label: word.repeat(30),
          url: word.repeat(100),
        })),
      },
      summary: word.repeat(1_000),
      experience: Array.from({ length: 45 }, () => ({
        company: word.repeat(50),
        title: word.repeat(50),
        location: word.repeat(50),
        startDate: word.repeat(20),
        endDate: word.repeat(20),
        bullets,
      })),
      education: Array.from({ length: 25 }, () => ({
        school: word.repeat(50),
        degree: word.repeat(50),
        field: word.repeat(50),
        location: "",
        startDate: "",
        endDate: "",
        bullets,
      })),
      projects: Array.from({ length: 35 }, () => ({
        name: word.repeat(50),
        link: word.repeat(100),
        bullets,
      })),
      skills: Array.from({ length: 35 }, () => ({
        label: word.repeat(30),
        items: Array.from({ length: 120 }, () => word.repeat(30)),
      })),
      certifications: Array.from({ length: 45 }, () => ({
        name: word.repeat(50),
        issuer: word.repeat(50),
        date: word.repeat(20),
      })),
      extras: Array.from({ length: 12 }, () => ({
        kind: "custom" as const,
        title: word.repeat(30),
        items: Array.from({ length: 35 }, () => ({
          title: word.repeat(50),
          subtitle: word.repeat(50),
          date: word.repeat(20),
          detail: word.repeat(100),
          bullets,
        })),
      })),
    };
    runStructured.mockResolvedValueOnce(parsed);
    const { resume, usedAI } = await structureResume(`${word.repeat(10)}ipsum`, NOW);

    expect(usedAI).toBe(true);
    expect(ResumeSchema.safeParse(resume).success).toBe(true);
    expect(resume.basics.name.length).toBeLessThanOrEqual(200);
    expect(resume.basics.phone.length).toBeLessThanOrEqual(50);
    expect(resume.basics.links).toHaveLength(10);
    expect(resume.summary.length).toBeLessThanOrEqual(3_000);
    expect(resume.experience).toHaveLength(40);
    expect(resume.experience[0]?.bullets).toHaveLength(40);
    expect(resume.experience[0]?.bullets[0]?.text.length).toBeLessThanOrEqual(1_000);
    expect(resume.experience[0]?.startDate.length).toBeLessThanOrEqual(50);
    expect(resume.education).toHaveLength(20);
    expect(resume.education[0]?.bullets).toHaveLength(20);
    expect(resume.projects).toHaveLength(30);
    expect(resume.projects[0]?.bullets).toHaveLength(20);
    expect(resume.skills).toHaveLength(30);
    expect(resume.skills[0]?.items).toHaveLength(100);
    expect(resume.skills[0]?.items[0]?.length).toBeLessThanOrEqual(100);
    expect(resume.certifications).toHaveLength(40);
    expect(resume.extras).toHaveLength(10);
    expect(resume.extras?.[0]?.title.length).toBeLessThanOrEqual(100);
    expect(resume.extras?.[0]?.items).toHaveLength(30);
    expect(resume.extras?.[0]?.items[0]?.detail.length).toBeLessThanOrEqual(500);
    expect(resume.extras?.[0]?.items[0]?.bullets).toHaveLength(20);
    const ids = allIds(resume);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

const EXTRAS_TEXT = `${TEXT}

LANGUAGES
English (Native), Spanish (B2)

Honors & Awards
Employee of the Year | Acme Payments | 2022

Volunteer Experience
Volunteer Tutor, Code Club, 2019 - 2021
• Taught 30 kids to build their first website

Interests
Chess, hiking, jazz piano`;

function parsedWithExtras(): Parsed {
  return {
    ...parsedJane(),
    extras: [
      {
        kind: "languages",
        title: "LANGUAGES",
        items: [
          { title: "English", subtitle: "Native", date: "", detail: "", bullets: [] },
          { title: "Spanish", subtitle: "B2", date: "", detail: "", bullets: [] },
        ],
      },
      {
        kind: "awards",
        title: "Honors & Awards",
        items: [
          {
            title: "Employee of the Year",
            subtitle: "Acme Payments",
            date: "2022",
            detail: "",
            bullets: [],
          },
          { title: "", subtitle: "", date: "", detail: "  ", bullets: [""] },
        ],
      },
      {
        kind: "volunteering",
        title: "Volunteer Experience",
        items: [
          {
            title: "Volunteer Tutor",
            subtitle: "Code Club",
            date: "2019 - 2021",
            detail: "",
            bullets: ["• Taught 30 kids to build their first website"],
          },
        ],
      },
      {
        kind: "custom",
        title: "Interests",
        items: [
          { title: "", subtitle: "", date: "", detail: "Chess, hiking, jazz piano", bullets: [] },
        ],
      },
      { kind: "publications", title: "Publications", items: [] },
    ],
  };
}

describe("structureResume extra sections", () => {
  it("asks for extra sections in the schema and the prompt", async () => {
    runStructured.mockResolvedValueOnce(parsedWithExtras());
    await structureResume(EXTRAS_TEXT, NOW);
    const sent = runStructured.mock.calls[0]?.[0];
    expect(sent?.system).toContain('"languages": spoken languages');
    expect(sent?.schema.safeParse(parsedWithExtras()).success).toBe(true);
    const schema = sent ? jsonSchemaFor(sent.schema) : null;
    expect(JSON.stringify(schema)).toContain(
      '"enum":["languages","awards","volunteering","publications","custom"]',
    );
  });

  it("fills resume.extras in order, with tidy titles and no empty items or sections", async () => {
    runStructured.mockResolvedValueOnce(parsedWithExtras());
    const { resume, usedAI } = await structureResume(EXTRAS_TEXT, NOW);
    expect(usedAI).toBe(true);
    expect(ResumeSchema.safeParse(resume).success).toBe(true);
    const extras = resume.extras ?? [];
    expect(extras.map((section) => [section.kind, section.title])).toEqual([
      ["languages", "Languages"],
      ["awards", "Honors & Awards"],
      ["volunteering", "Volunteer Experience"],
      ["custom", "Interests"],
    ]);
    expect(extras[0]?.items.map((item) => [item.title, item.subtitle])).toEqual([
      ["English", "Native"],
      ["Spanish", "B2"],
    ]);
    expect(extras[1]?.items).toHaveLength(1);
    expect(extras[2]?.items[0]).toMatchObject({
      title: "Volunteer Tutor",
      subtitle: "Code Club",
      date: "2019 - 2021",
      bullets: [{ text: "Taught 30 kids to build their first website" }],
    });
    expect(extras[3]?.items[0]?.detail).toBe("Chess, hiking, jazz piano");
    const ids = allIds(resume);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("names a section by its kind when the heading came back empty", async () => {
    const parsed = parsedWithExtras();
    parsed.extras = [
      {
        kind: "awards",
        title: "",
        items: [{ title: "Employee of the Year", subtitle: "", date: "", detail: "", bullets: [] }],
      },
      {
        kind: "custom",
        title: " ",
        items: [
          { title: "", subtitle: "", date: "", detail: "Chess, hiking, jazz piano", bullets: [] },
        ],
      },
    ];
    runStructured.mockResolvedValueOnce(parsed);
    const { resume } = await structureResume(EXTRAS_TEXT, NOW);
    expect(resume.extras?.map((section) => section.title)).toEqual([
      "Awards",
      "Additional information",
    ]);
  });

  it("counts extra sections as content, and checks them for faithfulness", async () => {
    const onlyExtras = { ...emptyParsed(), extras: parsedWithExtras().extras };
    runStructured.mockResolvedValueOnce(onlyExtras);
    const kept = await structureResume(EXTRAS_TEXT, NOW);
    expect(kept.usedAI).toBe(true);
    expect(kept.resume.extras).toHaveLength(4);

    const invented = parsedWithExtras();
    invented.extras = [
      {
        kind: "awards",
        title: "Awards",
        items: Array.from({ length: 6 }, (_, i) => ({
          title: `Visionary Global Leadership Excellence Trophy ${i}`,
          subtitle: "International Fintech Innovation Council",
          date: "2023",
          detail: "Recognized for transformative strategic impact across worldwide markets",
          bullets: [],
        })),
      },
    ];
    runStructured.mockResolvedValueOnce(invented);
    const rejected = await structureResume(EXTRAS_TEXT, NOW);
    expect(rejected.usedAI).toBe(false);
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining("ai.structure_rejected"),
      expect.objectContaining({ reason: "unfaithful" }),
    );
  });
});

describe("structureResume fallbacks", () => {
  it("falls back to the rule-based parser when the AI call fails", async () => {
    runStructured.mockRejectedValueOnce(new AIError("unavailable", "down"));
    const result = await structureResume(TEXT, NOW);
    expect(result.usedAI).toBe(false);
    expect(heuristicParse).toHaveBeenCalledWith(TEXT, NOW);
    expect(result.resume.basics.name).toBe("Jane Doe");
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining("ai.structure_fallback"),
      expect.objectContaining({ reason: "unavailable" }),
    );
  });

  it("falls back on unexpected errors too", async () => {
    runStructured.mockRejectedValueOnce(new TypeError("boom"));
    const result = await structureResume(TEXT, NOW);
    expect(result.usedAI).toBe(false);
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining("ai.structure_fallback"),
      expect.objectContaining({ reason: "unexpected" }),
    );
  });

  it("falls back when the AI returns nothing usable", async () => {
    runStructured.mockResolvedValueOnce(emptyParsed());
    const result = await structureResume(TEXT, NOW);
    expect(result.usedAI).toBe(false);
    expect(result.resume.basics.name).toBe("Jane Doe");
  });

  it("falls back when the AI rewrote the resume instead of copying it", async () => {
    const parsed = parsedJane();
    parsed.summary =
      "Visionary technologist spearheading transformative fintech initiatives worldwide.";
    parsed.experience = [
      {
        company: "Acme Payments",
        title: "Senior Engineer",
        location: "Berlin",
        startDate: "Jan 2021",
        endDate: "Present",
        bullets: [
          "Spearheaded a revolutionary payments platform transformation",
          "Championed resilient architecture delivering unprecedented reliability",
        ],
      },
    ];
    runStructured.mockResolvedValueOnce(parsed);
    const result = await structureResume(TEXT, NOW);
    expect(result.usedAI).toBe(false);
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining("ai.structure_rejected"),
      expect.objectContaining({ reason: "unfaithful" }),
    );
  });
});
