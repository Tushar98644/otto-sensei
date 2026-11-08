import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TEXT_LIMITS } from "@/config/plans";
import { resetEnvForTests } from "@/lib/env";
import { InterviewPrepSchema } from "@/lib/insights/prep";
import { emptyResume, type Resume } from "@/lib/resume/schema";
import type { StructuredRequest } from "./client";
import { cleanStories, novelShare, prepareInterview } from "./interview";
import { AIError, type WritingInput } from "./types";

const runStructured = vi.hoisted(() =>
  vi.fn<(request: StructuredRequest<unknown>) => Promise<unknown>>(),
);
vi.mock("./client", () => ({ runStructured }));

function makeResume(): Resume {
  return {
    ...emptyResume(0),
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
        ],
      },
    ],
  };
}

const JOB: WritingInput = {
  jobText:
    "Kestrel Labs is hiring a Senior Backend Engineer.\nWhat you bring:\n- Go services in production\n- PostgreSQL at scale\n",
  jobTitle: "Senior Backend Engineer",
  company: "Kestrel Labs",
};

const LINES = [
  { id: "l1", text: "Rebuilt the billing service in Go, cutting p99 latency by 40%", place: "Backend Engineer at Mapline" },
  { id: "l2", text: "Helped with the quarterly customer newsletter", place: "Backend Engineer at Mapline" },
];

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

describe("prepareInterview", () => {
  it("sends the resume, its numbered lines and the post as data, and copies lines in itself", async () => {
    runStructured.mockResolvedValueOnce({
      questions: [
        { question: "How have you run Go services in production?", why: "The post lists Go as a must-have." },
        { question: "How have you run Go services in production?", why: "Repeat" },
        { question: "Not a question", why: "" },
      ],
      stories: [
        {
          lineId: "l1",
          title: "Billing service rebuild",
          situation: "The billing service was slow [How slow, and for whom?]",
          task: "[What were you asked to do?]",
          action: "I rebuilt the billing service in Go",
          result: "Cut p99 latency by 40% and saved 300 hours a month",
        },
        { lineId: "l9", title: "Made up", situation: "", task: "", action: "", result: "" },
      ],
      asks: ["What does on-call look like for this team?", "no question mark"],
    });
    const prep = await prepareInterview(makeResume(), JOB, 123);

    const sent = runStructured.mock.calls[0]?.[0];
    expect(sent?.task).toBe("letter");
    expect(sent?.user).toContain("<experience>");
    expect(sent?.user).toContain('"id":"l1"');
    expect(sent?.user).toContain("<job_post>\nJob title: Senior Backend Engineer");

    expect(InterviewPrepSchema.safeParse(prep).success).toBe(true);
    expect(prep).toMatchObject({ version: 1, demo: false, createdAt: 123, job: { company: "Kestrel Labs" } });
    expect(prep.questions).toEqual([
      { question: "How have you run Go services in production?", why: "The post lists Go as a must-have." },
    ]);
    expect(prep.asks).toEqual(["What does on-call look like for this team?"]);
    expect(prep.stories).toHaveLength(1);
    const [story] = prep.stories;
    expect(story?.line).toBe("Rebuilt the billing service in Go, cutting p99 latency by 40%");
    expect(story?.place).toBe("Backend Engineer at Mapline");
    expect(story?.action).toBe("I rebuilt the billing service in Go");
    // 300 hours isn't in the line, so the number goes; the rest still matches the line.
    expect(story?.result).not.toContain("300");
  });

  it("hides the name, contact details and links from the model and puts them back after", async () => {
    const resume = makeResume();
    resume.basics = {
      ...resume.basics,
      name: "Priya Raman",
      email: "priya.raman@example.com",
      phone: "+1 415 555 0187",
      links: [{ id: "link-1", label: "GitHub", url: "github.com/priyaraman" }],
    };
    const first = resume.experience[0];
    if (first) {
      first.bullets = [
        ...first.bullets,
        { id: "b3", text: "Wrote the ledger docs at github.com/priyaraman/ledger, used by 12 teams" },
      ];
    }
    runStructured.mockResolvedValueOnce({
      questions: [{ question: "How did you document the ledger at [LINK_1]/ledger?", why: "The resume links it." }],
      stories: [],
      asks: [],
    });
    const prep = await prepareInterview(resume, JOB, 123);

    const sent = JSON.stringify(runStructured.mock.calls[0]?.[0]);
    for (const secret of ["Priya", "Raman", "priya.raman@example.com", "555 0187", "github.com/priyaraman"]) {
      expect(sent).not.toContain(secret);
    }
    expect(sent).toContain("[LINK_");
    expect(prep.questions[0]?.question).toContain("github.com/priyaraman/ledger");
    expect(prep.questions[0]?.question).not.toContain("[LINK_");
  });

  it("fails cleanly when no usable question comes back", async () => {
    runStructured.mockResolvedValueOnce({ questions: [], stories: [], asks: [] });
    await expect(prepareInterview(makeResume(), JOB)).rejects.toMatchObject({ code: "invalid_output" });
  });

  it("refuses a post over the limit before calling the model", async () => {
    const long = { ...JOB, jobText: "x".repeat(TEXT_LIMITS.jobPostChars + 1) };
    await expect(prepareInterview(makeResume(), long)).rejects.toBeInstanceOf(AIError);
    expect(runStructured).not.toHaveBeenCalled();
  });

  it("builds a demo pack from the post's list and the resume's own lines without a key", async () => {
    useKey(null);
    const prep = await prepareInterview(makeResume(), JOB, 5);
    expect(runStructured).not.toHaveBeenCalled();
    expect(prep.demo).toBe(true);
    expect(InterviewPrepSchema.safeParse(prep).success).toBe(true);
    expect(prep.questions.map((item) => item.question)).toContain(
      "What's your experience with this: Go services in production?",
    );
    // The line with a number comes first, and its action is the line itself.
    expect(prep.stories[0]?.action).toBe("Rebuilt the billing service in Go, cutting p99 latency by 40%");
    expect(prep.stories[1]?.result).toBe("[What changed because of it, and by how much?]");
    expect(prep.asks.length).toBeGreaterThan(0);
  });
});

describe("cleanStories", () => {
  it("swaps a part that adds facts for a blank and keeps the line's verb", () => {
    const [story] = cleanStories(
      [
        {
          lineId: "l2",
          title: "Newsletter",
          situation: "Customers churned because Kafka pipelines in Kubernetes kept failing",
          task: "[What was your part?]",
          action: "Led a redesign of the analytics platform with Snowflake",
          result: "Revenue doubled",
        },
      ],
      LINES,
    );
    expect(story?.situation).toBe("[What was going on, and why did it matter?]");
    expect(story?.task).toBe("[What was your part?]");
    expect(story?.action).toBe("Helped with the quarterly customer newsletter");
    expect(story?.result).toBe("[What changed because of it, and by how much?]");
  });

  it("uses each line once", () => {
    const item = { lineId: "l1", title: "", situation: "", task: "", action: "", result: "" };
    expect(cleanStories([item, item], LINES)).toHaveLength(1);
  });
});

describe("novelShare", () => {
  it("ignores brackets and filler, and matches word stems", () => {
    expect(novelShare("I launched it [When?]", "Launch of the add-on")).toBe(0);
    expect(novelShare("Migrated Kafka", "Rebuilt the billing service")).toBe(1);
  });
});
