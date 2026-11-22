import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TEXT_LIMITS } from "@/config/plans";
import { resetEnvForTests } from "@/lib/env";
import { InterviewPrepSchema } from "@/lib/insights/prep";
import { emptyResume, type Resume } from "@/lib/resume/schema";
import type { FocusChoice } from "@/lib/insights/prep-focus";
import type { StructuredRequest } from "./client";
import {
  cleanStories,
  INTERVIEW_SYSTEM_PROMPT,
  INTERVIEW_TECHNICAL_ROLE_PROMPT,
  namesIn,
  novelShare,
  prepareInterview,
} from "./interview";
import { TECHNICAL_SYSTEM_PROMPT } from "./interview-technical";
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
  {
    id: "l1",
    text: "Rebuilt the billing service in Go, cutting p99 latency by 40%",
    place: "Backend Engineer at Mapline",
  },
  {
    id: "l2",
    text: "Helped with the quarterly customer newsletter",
    place: "Backend Engineer at Mapline",
  },
];

const NO_TECHNICAL: FocusChoice = { role: "none", level: "auto" };

const QUESTION = {
  round: "fit" as const,
  question: "",
  checking: "",
  followUp: "",
  points: [] as string[],
  storyLineId: "",
};

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
        {
          round: "skills",
          question: "How have you run Go services in production?",
          checking: "Whether you've run Go for real.",
          followUp: "What broke first?",
          points: ["Your billing rebuild in Go", "Mention Kafka streams", "Cut p99 by 70%"],
          storyLineId: "l1",
        },
        { ...QUESTION, round: "skills", question: "How have you run Go services in production?" },
        { ...QUESTION, round: "skills", question: "Not a question" },
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
    const prep = await prepareInterview(makeResume(), JOB, { focus: NO_TECHNICAL, now: 123 });

    const sent = runStructured.mock.calls[0]?.[0];
    expect(sent?.task).toBe("letter");
    expect(sent?.maxTokens).toBe(8_000);
    expect(sent?.user).toContain("<experience>");
    expect(sent?.user).toContain('"id":"l1"');
    expect(sent?.user).toContain("<job_post>\nJob title: Senior Backend Engineer");

    expect(InterviewPrepSchema.safeParse(prep).success).toBe(true);
    expect(sent?.system).toBe(INTERVIEW_SYSTEM_PROMPT);
    expect(runStructured).toHaveBeenCalledTimes(1);
    expect(prep).toMatchObject({
      version: 3,
      demo: false,
      createdAt: 123,
      job: { company: "Kestrel Labs" },
      technical: null,
    });
    expect(prep.questions).toEqual([
      {
        round: "skills",
        question: "How have you run Go services in production?",
        checking: "Whether you've run Go for real.",
        followUp: "What broke first?",
        points: ["Your billing rebuild in Go", "Cut p99 by [number]"],
        story: 0,
      },
    ]);
    expect(prep.asks).toEqual(["What does on-call look like for this team?"]);
    expect(prep.stories).toHaveLength(1);
    const [story] = prep.stories;
    expect(story?.line).toBe("Rebuilt the billing service in Go, cutting p99 latency by 40%");
    expect(story?.place).toBe("Backend Engineer at Mapline");
    expect(story?.action).toBe("I rebuilt the billing service in Go");
    expect(story?.result).not.toContain("300");
  });

  it("puts questions in interview order and links only stories that were kept", async () => {
    runStructured.mockResolvedValueOnce({
      questions: [
        {
          ...QUESTION,
          round: "closing",
          question: "Anything we haven't covered that you'd want us to know?",
        },
        {
          ...QUESTION,
          round: "behavioural",
          question: "Tell me about a time a release went wrong.",
          storyLineId: "l2",
        },
        { ...QUESTION, round: "opening", question: "“Walk me through your background.”" },
        {
          ...QUESTION,
          round: "skills",
          question: "How would you shard the billing tables?",
          storyLineId: "l9",
        },
        {
          ...QUESTION,
          round: "behavioural",
          question: "Tell me about a time you disagreed with a lead?",
        },
      ],
      stories: [
        { lineId: "l9", title: "Made up", situation: "", task: "", action: "", result: "" },
        {
          lineId: "l2",
          title: "Customer newsletter",
          situation: "[What was going on?]",
          task: "[What were you asked to do?]",
          action: "Helped with the quarterly customer newsletter",
          result: "[What changed?]",
        },
      ],
      asks: [],
    });
    const prep = await prepareInterview(makeResume(), JOB, { focus: NO_TECHNICAL, now: 1 });

    expect(prep.questions.map((item) => [item.round, item.question])).toEqual([
      ["opening", "Walk me through your background."],
      ["skills", "How would you shard the billing tables?"],
      ["behavioural", "Tell me about a time a release went wrong."],
      ["behavioural", "Tell me about a time you disagreed with a lead?"],
      ["closing", "Anything we haven't covered that you'd want us to know?"],
    ]);
    expect(prep.questions.map((item) => item.story)).toEqual([null, null, 0, null, null]);
    expect(prep.stories[0]?.title).toBe("Customer newsletter");
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
        {
          id: "b3",
          text: "Wrote the ledger docs at github.com/priyaraman/ledger, used by 12 teams",
        },
      ];
    }
    runStructured.mockResolvedValueOnce({
      questions: [
        {
          ...QUESTION,
          question: "How did you document the ledger at [LINK_1]/ledger?",
          points: ["Say [NAME] wrote the docs used by 12 teams"],
        },
      ],
      stories: [],
      asks: [],
    });
    const prep = await prepareInterview(resume, JOB, { focus: NO_TECHNICAL, now: 123 });

    const sent = JSON.stringify(runStructured.mock.calls[0]?.[0]);
    for (const secret of [
      "Priya",
      "Raman",
      "priya.raman@example.com",
      "555 0187",
      "github.com/priyaraman",
    ]) {
      expect(sent).not.toContain(secret);
    }
    expect(sent).toContain("[LINK_");
    expect(prep.questions[0]?.question).toContain("github.com/priyaraman/ledger");
    expect(prep.questions[0]?.question).not.toContain("[LINK_");
    expect(prep.questions[0]?.points).toEqual(["Say Priya Raman wrote the docs used by 12 teams"]);
  });

  it("fails cleanly when no usable question comes back", async () => {
    runStructured.mockResolvedValueOnce({ questions: [], stories: [], asks: [] });
    await expect(
      prepareInterview(makeResume(), JOB, { focus: NO_TECHNICAL }),
    ).rejects.toMatchObject({
      code: "invalid_output",
    });
  });

  it("refuses a post over the limit before calling the model", async () => {
    const long = { ...JOB, jobText: "x".repeat(TEXT_LIMITS.jobPostChars + 1) };
    await expect(prepareInterview(makeResume(), long)).rejects.toBeInstanceOf(AIError);
    expect(runStructured).not.toHaveBeenCalled();
  });

  it("builds a demo pack from the post's list and the resume's own lines without a key", async () => {
    useKey(null);
    const prep = await prepareInterview(makeResume(), JOB, { focus: NO_TECHNICAL, now: 5 });
    expect(runStructured).not.toHaveBeenCalled();
    expect(prep.demo).toBe(true);
    expect(InterviewPrepSchema.safeParse(prep).success).toBe(true);
    expect(prep.questions.map((item) => item.question)).toContain(
      "The post lists “Go services in production”. Where have you done that, and how did it go?",
    );
    const rounds = prep.questions.map((item) => item.round);
    expect(rounds[0]).toBe("opening");
    expect(rounds.at(-1)).toBe("closing");
    expect(prep.questions[0]?.points).toEqual([
      "Start with where you are now: Backend Engineer at Mapline",
      "Lead with one result: “Rebuilt the billing service in Go, cutting p99 latency by 40%”",
      "End on why this job is the next step",
    ]);
    expect(prep.questions.find((item) => item.round === "behavioural")?.story).toBe(0);
    expect(prep.stories[0]?.action).toBe(
      "Rebuilt the billing service in Go, cutting p99 latency by 40%",
    );
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

describe("namesIn", () => {
  it("finds names inside a sentence and inner capitals, not sentence starts or blanks", () => {
    expect(namesIn("Tie it to their PostgreSQL must-have, then Kafka.")).toEqual([
      "PostgreSQL",
      "Kafka",
    ]);
    expect(namesIn("Say what you'd measure. Then stop. I'd ask [Which Tool?]")).toEqual([]);
    expect(namesIn("AWS first: “Cut costs”")).toEqual(["AWS"]);
  });
});

describe("novelShare", () => {
  it("ignores brackets and filler, and matches word stems", () => {
    expect(novelShare("I launched it [When?]", "Launch of the add-on")).toBe(0);
    expect(novelShare("Migrated Kafka", "Rebuilt the billing service")).toBe(1);
  });
});

const BASE_OUTPUT = {
  questions: [
    { ...QUESTION, round: "opening" as const, question: "Walk me through your background." },
    {
      ...QUESTION,
      round: "behavioural" as const,
      question: "Tell me about a release that went wrong.",
      points: [
        "Explain the trade-off between LRU and LFU eviction, and where a TTL fits",
        "Mention Kafka streams",
        "Your Redis cluster work",
        "Lead with your Go billing rebuild",
      ],
    },
  ],
  stories: [],
  asks: [],
};

const NOTES = {
  covers: [
    "Cache-aside in Redis with a TTL; invalidate on write after the commit",
    "Prevent stampedes with request coalescing or a lock per key",
    "Mention your Kafka work",
    "Your cache cut p99 by 70%",
  ],
  pitfalls: ["Updating the cache before the database commits"],
  probes: [
    "What happens when two writes race on the same key?",
    "not a question",
    "When would write-through win?",
  ],
};

const TECHNICAL_OUTPUT = {
  questions: [
    {
      kind: "concept" as const,
      topic: "Caching.",
      question:
        "Our product page reads the same rows thousands of times a minute. Where would you add a cache?",
      assume: "Assume nothing.",
      lineId: "",
      ...NOTES,
    },
    {
      kind: "deep-dive" as const,
      topic: "Latency",
      question:
        "You rebuilt the billing service in Go, cutting p99 by 40%. How did you find what was slow?",
      assume: "",
      lineId: "l1",
      ...NOTES,
    },
    {
      kind: "deep-dive" as const,
      topic: "Sharding",
      question: "You rebuilt billing on Kafka and Redis. How did you shard it?",
      assume: "",
      lineId: "l2",
      ...NOTES,
    },
    {
      kind: "deep-dive" as const,
      topic: "Ghost",
      question: "How did the ledger work?",
      assume: "",
      lineId: "l9",
      ...NOTES,
    },
    {
      kind: "coding" as const,
      topic: "LRU",
      question: "Implement an LRU cache.",
      assume: "",
      lineId: "",
      ...NOTES,
    },
    {
      kind: "design" as const,
      topic: "Rate limiter",
      question: "Design a rate limiter for our public API.",
      assume: "",
      lineId: "",
      ...NOTES,
    },
    {
      kind: "design" as const,
      topic: "Second",
      question: "Design a URL shortener.",
      assume: "",
      lineId: "",
      ...NOTES,
    },
    {
      kind: "concept" as const,
      topic: "Thin",
      question: "What is a queue?",
      assume: "",
      lineId: "",
      covers: ["Mention your Kafka work"],
      pitfalls: [],
      probes: [],
    },
  ],
};

function answerBoth(base: unknown = BASE_OUTPUT, technical: unknown = TECHNICAL_OUTPUT) {
  runStructured.mockImplementation(async (request) =>
    request.task === "interview" ? technical : base,
  );
}

describe("the technical round", () => {
  it("runs beside the general rounds on the interview model, with the plan for this role and level", async () => {
    answerBoth();
    const prep = await prepareInterview(makeResume(), JOB, { now: 9 });

    expect(runStructured).toHaveBeenCalledTimes(2);
    const [general, technical] = runStructured.mock.calls.map(([request]) => request);
    expect(general).toMatchObject({
      task: "letter",
      effort: "low",
      system: INTERVIEW_TECHNICAL_ROLE_PROMPT,
    });
    expect(technical).toMatchObject({
      task: "interview",
      effort: "medium",
      maxTokens: 10_000,
      system: TECHNICAL_SYSTEM_PROMPT,
    });
    expect(technical?.user).toContain("<plan>\nRole focus: Backend engineer\nLevel: Senior.");
    expect(technical?.user).toContain("Idempotency and safe retries");
    expect(technical?.user).toContain("Zero-downtime migrations and backfills");
    expect(technical?.user).toContain("Coding round: not signalled. Write no coding questions.");
    expect(technical?.user).toContain('"id":"l1"');

    expect(InterviewPrepSchema.safeParse(prep).success).toBe(true);
    expect(prep.technical).toMatchObject({ focus: "backend", level: "senior", coding: false });
    const questions = prep.technical?.questions ?? [];
    expect(questions.map((item) => [item.kind, item.topic])).toEqual([
      ["deep-dive", "Latency"],
      ["concept", "Caching"],
      ["design", "Rate limiter"],
    ]);
    const [deepDive, concept, design] = questions;
    expect(deepDive?.resume).toEqual({
      line: "Rebuilt the billing service in Go, cutting p99 latency by 40%",
      place: "Backend Engineer at Mapline",
    });
    expect(concept?.resume).toBeNull();
    expect(concept?.assume).toBe("");
    expect(design?.assume).toBe(
      "Assume about 20 million users and around 10,000 requests a second at peak, in two regions.",
    );
    expect(concept?.covers).toEqual([
      "Cache-aside in Redis with a TTL; invalidate on write after the commit",
      "Prevent stampedes with request coalescing or a lock per key",
      "Your cache cut p99 by [number]",
    ]);
    expect(concept?.probes).toEqual([
      "What happens when two writes race on the same key?",
      "When would write-through win?",
    ]);
  });

  it("keeps concept names in the general rounds' points but drops claims the resume doesn't make", async () => {
    answerBoth();
    const prep = await prepareInterview(makeResume(), JOB, { now: 9 });
    expect(prep.questions.find((item) => item.round === "behavioural")?.points).toEqual([
      "Explain the trade-off between LRU and LFU eviction, and where a TTL fits",
      "Lead with your Go billing rebuild",
    ]);
  });

  it("asks for coding warm-ups only when the post signals a coding round", async () => {
    answerBoth();
    const coding = {
      ...JOB,
      jobText: `${JOB.jobText}\nOur process: a 45-minute live coding interview.`,
    };
    const prep = await prepareInterview(makeResume(), coding, { now: 9 });
    expect(runStructured.mock.calls[1]?.[0].user).toContain("Coding round: likely");
    expect(prep.technical?.coding).toBe(true);
    expect(prep.technical?.questions.map((item) => item.kind)).toContain("coding");
  });

  it("uses the person's choice of focus and level over the pick", async () => {
    answerBoth();
    const prep = await prepareInterview(makeResume(), JOB, {
      focus: { role: "frontend", level: "junior" },
    });
    expect(runStructured.mock.calls[1]?.[0].user).toContain(
      "Role focus: Frontend engineer\nLevel: Junior.",
    );
    expect(prep.technical).toMatchObject({ focus: "frontend", level: "junior" });
  });

  it("keeps today's single call for a role with no technical round", async () => {
    answerBoth();
    const marketing = {
      ...JOB,
      jobTitle: "Marketing Manager, AI",
      jobText: "We're hiring a marketing manager.",
    };
    const prep = await prepareInterview(makeResume(), marketing, { now: 9 });
    expect(runStructured).toHaveBeenCalledTimes(1);
    expect(runStructured.mock.calls[0]?.[0].system).toBe(INTERVIEW_SYSTEM_PROMPT);
    expect(prep.technical).toBeNull();
  });

  it("fails cleanly when the technical round has nothing usable", async () => {
    answerBoth(BASE_OUTPUT, { questions: [] });
    await expect(prepareInterview(makeResume(), JOB)).rejects.toMatchObject({
      code: "invalid_output",
    });
  });

  it("waits for both calls before failing, so the meter counts each one", async () => {
    let finished = false;
    runStructured.mockImplementation(async (request) => {
      if (request.task === "letter") throw new AIError("unavailable", "down");
      await new Promise((resolve) => setTimeout(resolve, 5));
      finished = true;
      return TECHNICAL_OUTPUT;
    });
    await expect(prepareInterview(makeResume(), JOB)).rejects.toMatchObject({
      code: "unavailable",
    });
    expect(finished).toBe(true);
  });

  it("keeps the person's name and links out of the technical call too", async () => {
    const resume = makeResume();
    resume.basics = { ...resume.basics, name: "Priya Raman", email: "priya.raman@example.com" };
    answerBoth();
    await prepareInterview(resume, JOB);
    const sent = JSON.stringify(runStructured.mock.calls[1]?.[0]);
    expect(sent).not.toContain("Priya");
    expect(sent).not.toContain("priya.raman@example.com");
  });
});

describe("demo technical rounds", () => {
  const cases: [string, WritingInput, Resume, string][] = [
    [
      "ai-ml",
      {
        jobTitle: "AI Engineer",
        company: "Lumen",
        jobText:
          "We're hiring an AI engineer to build RAG features with LLMs, evals and semantic caching.",
      },
      (() => {
        const resume = makeResume();
        resume.experience[0]!.bullets.push({
          id: "b3",
          text: "Built a RAG assistant over 40,000 support tickets with pgvector and reranking",
        });
        return resume;
      })(),
      "Semantic caching",
    ],
    ["backend", JOB, makeResume(), "Caching and invalidation"],
    [
      "frontend",
      {
        jobTitle: "Junior Frontend Engineer",
        company: "Fernhill",
        jobText: "React and Next.js, accessibility, and a take-home exercise.",
      },
      makeResume(),
      "Rendering strategies",
    ],
  ];

  it.each(cases)(
    "gives a %s pack with deep-dives, concepts and one design question",
    async (focus, job, resume, first) => {
      useKey(null);
      const prep = await prepareInterview(resume, job, { now: 5 });
      expect(runStructured).not.toHaveBeenCalled();
      expect(InterviewPrepSchema.safeParse(prep).success).toBe(true);
      expect(prep.technical?.focus).toBe(focus);
      const questions = prep.technical?.questions ?? [];
      expect(questions.length).toBeGreaterThanOrEqual(8);
      expect(questions.length).toBeLessThanOrEqual(12);
      expect(questions.filter((item) => item.kind === "design")).toHaveLength(1);
      expect(questions.find((item) => item.kind === "design")?.assume).toMatch(/^Assume /);
      expect(questions.filter((item) => item.kind === "concept")[0]?.topic).toBe(first);
      for (const item of questions) {
        expect(item.covers.length).toBeGreaterThanOrEqual(3);
        expect(item.probes).toHaveLength(2);
        if (item.kind === "deep-dive")
          expect(resume.experience[0]?.bullets.map((b) => b.text)).toContain(item.resume?.line);
      }
      expect(prep.questions.some((item) => item.round === "skills")).toBe(false);
    },
  );

  it("adds warm-ups when the post mentions a coding round, and keeps juniors off senior topics", async () => {
    useKey(null);
    const prep = await prepareInterview(makeResume(), cases[2]![1], { now: 5 });
    expect(prep.technical).toMatchObject({ level: "junior", coding: true });
    const topics = prep.technical?.questions.map((item) => item.topic) ?? [];
    expect(topics).toContain("Debounce");
    expect(topics).not.toContain("Component API design");
  });
});
