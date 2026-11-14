import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TEXT_LIMITS } from "@/config/plans";
import { resetEnvForTests } from "@/lib/env";
import { resumeToText } from "@/lib/resume/ops";
import { emptyResume, type Resume } from "@/lib/resume/schema";
import type { RunOptions, StructuredRequest } from "./client";
import { AIError, type WritingInput } from "./types";
import { answerQuestion, assembleLetter, writeCoverLetter } from "./writing";

const runStructured = vi.hoisted(() =>
  vi.fn<(request: StructuredRequest<unknown>, options?: RunOptions) => Promise<unknown>>(),
);
vi.mock("./client", () => ({ runStructured }));

function makeResume(): Resume {
  return {
    ...emptyResume(0),
    basics: { name: "Sam Rivera", headline: "", email: "sam@example.com", phone: "", location: "", links: [] },
    experience: [
      {
        id: "job-1",
        company: "Mapline",
        title: "Backend Engineer",
        location: "",
        startDate: "2021",
        endDate: "Present",
        bullets: [
          { id: "b1", text: "Rebuilt the billing service in Go, cutting p99 latency by 40%" },
          { id: "b2", text: "Helped with the quarterly customer newsletter" },
          { id: "b3", text: "Ran the weekly on-call rotation for 6 services" },
        ],
      },
    ],
  };
}

const JOB: WritingInput = {
  jobText: "Kestrel Labs is hiring a Senior Backend Engineer. You have shipped Go services in production.",
  jobTitle: "Senior Backend Engineer",
  company: "Kestrel Labs",
};

const CLEAN = [
  "I'm applying for the Senior Backend Engineer role at Kestrel Labs. At Mapline I rebuilt the billing service in Go, cutting p99 latency by 40%.",
  "I like to keep services small and easy to reason about, and I said so in every review. I also run the weekly on-call rotation for 6 services, so I care about clear alerts, calm handovers and fixes that stay fixed. Most weeks the rotation is quiet, and when it isn't, the notes we keep make the next incident shorter. I write those notes so the next person can act on them without asking me first.",
  "Your post talks about Go services in production, which is the work I like most and want to keep doing. I'd be glad to talk about the role, and about how the billing rebuild went, including the parts that didn't go to plan the first time.",
];
const FULL = CLEAN.map((paragraph, i) =>
  i === 1 ? `${paragraph} The runbooks stay short, current and easy to follow.` : paragraph,
);

function useKey(key: string | null) {
  if (key) process.env.OPENROUTER_API_KEY = key;
  else delete process.env.OPENROUTER_API_KEY;
  resetEnvForTests();
}

beforeEach(() => {
  useKey("test-key");
  runStructured.mockReset();
});

afterEach(() => {
  useKey(null);
});

describe("writeCoverLetter", () => {
  it("sends the resume and the post as data and wraps the body in a greeting and sign-off", async () => {
    runStructured.mockResolvedValueOnce({ paragraphs: CLEAN });
    const result = await writeCoverLetter(makeResume(), JOB);

    const sent = runStructured.mock.calls[0]?.[0];
    expect(sent).toMatchObject({ task: "letter", effort: "low" });
    const shown = resumeToText(makeResume())
      .replace("Sam Rivera", "[NAME]")
      .replace("sam@example.com", "[EMAIL_1]");
    expect(sent?.user).toContain(`<resume>\n${shown}\n</resume>`);
    expect(sent?.user).toContain("<job_post>\nJob title: Senior Backend Engineer\nCompany: Kestrel Labs\n");
    expect(runStructured).toHaveBeenCalledTimes(1);

    expect(result.letter).toBe(assembleLetter(CLEAN, "Sam Rivera", "Kestrel Labs"));
    expect(result.letter.startsWith("Dear Kestrel Labs team,\n\nI'm applying")).toBe(true);
    expect(result.letter.endsWith("\n\nBest regards,\nSam Rivera")).toBe(true);
    expect(result.words).toBe(148);
    expect(result.warnings).toEqual([]);
  });

  it("retries once with the problems spelled out and keeps the better draft", async () => {
    runStructured
      .mockResolvedValueOnce({
        paragraphs: [
          "I am writing to express my interest in the role. I wrote and published the quarterly customer newsletter.",
          ...CLEAN.slice(1),
        ],
      })
      .mockResolvedValueOnce({ paragraphs: CLEAN });
    const result = await writeCoverLetter(makeResume(), JOB);

    expect(runStructured).toHaveBeenCalledTimes(2);
    const retry = runStructured.mock.calls[1]?.[0].user ?? "";
    expect(retry).toContain("A first draft had these problems");
    expect(retry).toContain('"I am writing to"');
    expect(retry).toContain('You wrote "wrote", but the resume line says: "Helped with the quarterly customer newsletter"');
    expect(result.letter).toContain(CLEAN[0]);
    expect(result.warnings).toEqual([]);
  });

  it("keeps the first draft, masked and flagged, when the retry fails", async () => {
    runStructured
      .mockResolvedValueOnce({
        paragraphs: [
          "I cut p99 latency by [40%] and grew revenue 3x. I wrote and published the quarterly customer newsletter.",
          ...CLEAN.slice(1),
        ],
      })
      .mockRejectedValueOnce(new AIError("unavailable", "down"));
    const result = await writeCoverLetter(makeResume(), JOB);

    expect(result.letter).toContain("I cut p99 latency by 40% and grew revenue [number].");
    expect(result.warnings).toEqual([
      "Fill in [number] before you send it. Otto never guesses numbers.",
      "Check “wrote”. Your resume says “Helped with the quarterly customer newsletter”.",
      "Check “published”. Your resume says “Helped with the quarterly customer newsletter”.",
    ]);
  });

  it("drops stock-phrase sentences the letter can spare and clips it to 250 words", async () => {
    const long = Array.from({ length: 40 }, (_, i) => `Sentence ${i} has a few plain words in it.`);
    runStructured.mockResolvedValue({
      paragraphs: [`I'm thrilled to apply. ${CLEAN[0]}`, CLEAN[1], long.join(" ")],
    });
    const result = await writeCoverLetter(makeResume(), JOB);
    expect(result.letter).not.toContain("thrilled");
    expect(result.words).toBeLessThanOrEqual(250);
    expect(result.letter.endsWith("Best regards,\nSam Rivera")).toBe(true);
  });

  it("gives the first draft the whole time budget", async () => {
    runStructured.mockResolvedValueOnce({ paragraphs: CLEAN });
    await writeCoverLetter(makeResume(), JOB);
    expect(runStructured.mock.calls[0]?.[1]).toEqual({ deadlineMs: 50_000 });
  });

  it("drops a stock-phrase sentence instead of paying for a second draft", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    runStructured.mockResolvedValueOnce({
      paragraphs: [`${FULL[0]} I'm excited to bring that work to Kestrel Labs.`, ...FULL.slice(1)],
    });
    const result = await writeCoverLetter(makeResume(), JOB);
    expect(runStructured).toHaveBeenCalledTimes(1);
    expect(info).toHaveBeenCalledWith("[info] letter.retry_skipped", { cliches: 1 });
    info.mockRestore();
    expect(result.letter).toBe(assembleLetter(FULL, "Sam Rivera", "Kestrel Labs"));
    expect(result.words).toBe(157);
    expect(result.warnings).toEqual([]);
  });

  it.each([
    ["would leave it too short", [`I'm excited to apply. ${CLEAN[0]}`, ...CLEAN.slice(1)]],
    ["would empty a paragraph", [...FULL, "I'm excited to hear from you."]],
  ])("still asks for a second draft when dropping the stock phrase %s", async (_label, first) => {
    runStructured
      .mockResolvedValueOnce({ paragraphs: first })
      .mockResolvedValueOnce({ paragraphs: FULL });
    const result = await writeCoverLetter(makeResume(), JOB);
    expect(runStructured).toHaveBeenCalledTimes(2);
    expect(runStructured.mock.calls[1]?.[0].user).toContain('stock phrases: "excited to"');
    expect(runStructured.mock.calls[1]?.[1]?.deadlineMs).toBeGreaterThanOrEqual(15_000);
    expect(result.letter).toBe(assembleLetter(FULL, "Sam Rivera", "Kestrel Labs"));
  });

  it("keeps the resume's own terms, even when they hold a stock word", async () => {
    const resume = makeResume();
    resume.experience[0]?.bullets.push({ id: "b4", text: "Built the dynamic pricing engine" });
    const own = `${FULL[0]} I also built the dynamic pricing engine.`;
    runStructured.mockResolvedValueOnce({ paragraphs: [own, ...FULL.slice(1)] });
    const result = await writeCoverLetter(resume, JOB);
    expect(runStructured).toHaveBeenCalledTimes(1);
    expect(result.letter).toContain("I also built the dynamic pricing engine.");
    expect(result.warnings).toEqual([]);
  });

  it("refuses an over-long post before calling the AI", async () => {
    const jobText = "a".repeat(TEXT_LIMITS.jobPostChars + 1);
    await expect(writeCoverLetter(makeResume(), { ...JOB, jobText })).rejects.toMatchObject({
      code: "too_long",
    });
    expect(runStructured).not.toHaveBeenCalled();
  });

  it("writes a demo letter from the resume's own lines without a key", async () => {
    useKey(null);
    const result = await writeCoverLetter(makeResume(), { ...JOB, company: "" });
    expect(runStructured).not.toHaveBeenCalled();
    expect(result.letter.startsWith("Dear hiring team,\n\nI'm applying for the Senior Backend Engineer.")).toBe(
      true,
    );
    expect(result.letter).toContain("As Backend Engineer at Mapline, I rebuilt the billing service in Go");
    expect(result.warnings).toEqual([]);
  });
});

describe("answerQuestion", () => {
  it("sends the question as data and names the blanks the person has to fill", async () => {
    runStructured.mockResolvedValueOnce({
      answer:
        "I want this job because it is Go work in production, which is what I do best. At Mapline I rebuilt the billing service in Go, cutting p99 latency by 40%, and I run the weekly on-call rotation for 6 services.\n\nI could start [your start date], and [why Kestrel Labs matters to you].",
    });
    const result = await answerQuestion(makeResume(), JOB, "  Why do you want to work here? ");

    const sent = runStructured.mock.calls[0]?.[0];
    expect(sent).toMatchObject({ task: "answer", effort: "low" });
    expect(sent?.user).toContain("<question>\nWhy do you want to work here?\n</question>");
    expect(result.answer.split("\n\n")).toHaveLength(2);
    expect(result.warnings).toEqual([
      "Fill in [your start date], [why Kestrel Labs matters to you] with your own words before you send it.",
    ]);
  });

  it("refuses a question too short to answer", async () => {
    await expect(answerQuestion(makeResume(), JOB, " Why? ")).rejects.toBeInstanceOf(AIError);
    expect(runStructured).not.toHaveBeenCalled();
  });

  it("drafts a demo answer without a key", async () => {
    useKey(null);
    const result = await answerQuestion(makeResume(), JOB, "Describe a challenge you faced.");
    expect(result.answer).toContain("sample answer");
    expect(result.warnings).toEqual([
      "Fill in [Add your own reason here.] with your own words before you send it.",
    ]);
  });
});
