import { describe, expect, it } from "vitest";
import { emptyResume, type Resume } from "@/lib/resume/schema";
import type { InterviewPrep, TechnicalSection } from "./prep";
import {
  countBlanks,
  orderedQuestions,
  practiceSteps,
  prepJobSource,
  prepResume,
  prepStops,
  prepToText,
  splitBlanks,
  storyUses,
} from "./prep-view";
import { savedJobText, savedRequirements } from "./saved-job";

const POST = "We're hiring a data engineer to build pipelines in Airflow and dbt. ".repeat(3);

function tailored(id: string, extra: Record<string, unknown> = {}, updatedAt = 1): Resume {
  return {
    ...emptyResume(updatedAt),
    id,
    source: "tailored",
    tailor: {
      baseResumeId: "base",
      jobTitle: "Data Engineer",
      company: "Mapline",
      keywords: [],
      createdAt: 1,
      ...extra,
    },
    updatedAt,
  };
}

const STORY = {
  title: "Billing rebuild",
  line: "Rebuilt billing in Go",
  place: "Engineer at Acme",
  situation: "[What was going on?]",
  task: "[What were you asked to do?]",
  action: "Rebuilt billing in Go",
  result: "Cut latency by [number]",
};

const PREP: InterviewPrep = {
  version: 3,
  technical: null,
  job: { title: "Data Engineer", company: "Mapline" },
  questions: [
    {
      round: "skills",
      question: "Walk me through how you'd test a dbt pipeline.",
      checking: "Whether you test data, not just code.",
      followUp: "What would you do when a test fails at 2am?",
      points: ["Your billing rebuild in Go", "[Which checks did you run?]"],
      story: 0,
    },
  ],
  stories: [STORY],
  asks: ["What does the team ship next?"],
  createdAt: 1,
  demo: false,
};

const QUESTION = { checking: "", followUp: "", points: [], story: null };

describe("prepJobSource", () => {
  it("uses the post saved with the copy first", () => {
    expect(
      prepJobSource({ jobUrl: "https://x.example/j" }, tailored("a", { jobText: POST })),
    ).toEqual({
      kind: "saved",
      text: POST.trim(),
    });
  });

  it("falls back to the link, then to pasting", () => {
    expect(prepJobSource({ jobUrl: "https://x.example/j" }, tailored("a"))).toEqual({
      kind: "link",
      url: "https://x.example/j",
    });
    expect(prepJobSource({ jobUrl: "" }, tailored("a", { jobUrl: "https://y.example/k" }))).toEqual(
      {
        kind: "link",
        url: "https://y.example/k",
      },
    );
    expect(prepJobSource({ jobUrl: "" }, null)).toEqual({ kind: "paste" });
  });

  it("ignores saved text too short to be a post", () => {
    expect(savedJobText(tailored("a", { jobText: "Apply now" }))).toBe("");
    expect(savedJobText(tailored("a", { jobText: 42 }))).toBe("");
  });
});

describe("savedRequirements", () => {
  it("keeps the entries that parse and reads a bad list as none", () => {
    const good = { text: "Airflow", importance: "must", terms: ["Airflow"] };
    expect(savedRequirements(tailored("a", { requirements: [good, "junk"] }))).toEqual([good]);
    expect(savedRequirements(tailored("a", { requirements: "junk" }))).toBeNull();
  });
});

describe("prepResume", () => {
  it("prefers the version sent, then the newest base resume", () => {
    const base = { ...emptyResume(5), id: "base" };
    const copy = tailored("copy", {}, 9);
    expect(prepResume({ resumeId: "copy" }, [base, copy])?.id).toBe("copy");
    expect(prepResume({ resumeId: "gone" }, [base, copy])?.id).toBe("base");
    expect(prepResume({ resumeId: null }, [copy])?.id).toBe("copy");
    expect(prepResume({ resumeId: null }, [])).toBeNull();
  });
});

describe("pack text", () => {
  it("marks blanks and counts the parts that still have one", () => {
    expect(splitBlanks("Cut latency by [number] for [who]")).toEqual([
      { text: "Cut latency by ", blank: false },
      { text: "[number]", blank: true },
      { text: " for ", blank: false },
      { text: "[who]", blank: true },
    ]);
    expect(countBlanks(PREP)).toBe(3);
  });

  it("writes the whole pack as plain text, round by round", () => {
    const text = prepToText(PREP, { company: "Mapline", role: "" });
    expect(text.split("\n")[0]).toBe("Interview prep: Data Engineer at Mapline");
    expect(text).toContain(
      [
        "Round 1 · Skills",
        "1. Walk me through how you'd test a dbt pipeline.",
        "   What they're checking: Whether you test data, not just code.",
        "   Hit these points:",
        "   - Your billing rebuild in Go",
        "   - [Which checks did you run?]",
        "   Use your story: Billing rebuild",
        "   Likely follow-up: What would you do when a test fails at 2am?",
      ].join("\n"),
    );
    expect(text).toContain("Your turn: questions to ask them\n- What does the team ship next?");
    expect(text).toContain('  From: "Rebuilt billing in Go" (Engineer at Acme)');
    expect(text.endsWith("  Result: Cut latency by [number]")).toBe(true);
  });
});

const TECHNICAL: TechnicalSection = {
  focus: "backend",
  level: "senior",
  coding: false,
  questions: [
    {
      kind: "deep-dive",
      topic: "Idempotent retries",
      question: "You rebuilt billing in Go. How did you make retries safe to repeat?",
      assume: "",
      covers: ["Idempotency keys under a unique constraint", "Replay the stored result on a retry"],
      pitfalls: ["Calling the provider before recording the attempt"],
      probes: ["What if the worker dies mid-charge?", "How long do keys live?"],
      resume: { line: "Rebuilt billing in Go", place: "Engineer at Acme" },
    },
    {
      kind: "design",
      topic: "Rate limiter",
      question: "Design a rate limiter for our public API.",
      assume: "Assume about 1 million users.",
      covers: ["Token bucket in Redis", "Return 429 with Retry-After"],
      pitfalls: [],
      probes: [],
      resume: null,
    },
  ],
};

describe("rounds", () => {
  const prep: Pick<InterviewPrep, "questions" | "stories" | "technical"> = {
    technical: null,
    stories: [STORY, { ...STORY, title: "Other", line: "Other line" }],
    questions: [
      { ...QUESTION, round: "closing", question: "Anything else?" },
      { ...QUESTION, round: "behavioural", question: "A time it went wrong?", story: 1 },
      { ...QUESTION, round: "opening", question: "Walk me through your background." },
      { ...QUESTION, round: "behavioural", question: "A time you disagreed?", story: 1 },
    ],
  };

  it("numbers questions in interview order, opening first and closing last", () => {
    expect(orderedQuestions(prep).map(({ item, number }) => [number, item.round])).toEqual([
      [1, "opening"],
      [2, "behavioural"],
      [3, "behavioural"],
      [4, "closing"],
    ]);
  });

  it("groups them by round, numbering only the rounds the pack has", () => {
    expect(
      prepStops(prep).map((group) => [
        group.number,
        group.round,
        group.questions.map((q) => q.number),
      ]),
    ).toEqual([
      [1, "opening", [1]],
      [2, "behavioural", [2, 3]],
      [3, "closing", [4]],
    ]);
  });

  it("lists which questions each story answers", () => {
    expect(storyUses(prep)).toEqual([[], [2, 3]]);
  });

  it("runs the technical round after the opening and before the behavioural questions", () => {
    const withTechnical = { ...prep, technical: TECHNICAL };
    expect(
      prepStops(withTechnical).map((group) => [
        group.number,
        group.round,
        group.questions.map((q) => q.number),
      ]),
    ).toEqual([
      [1, "opening", [1]],
      [2, "technical", [2, 3]],
      [3, "behavioural", [4, 5]],
      [4, "closing", [6]],
    ]);
    expect(storyUses(withTechnical)).toEqual([[], [4, 5]]);
    expect(
      practiceSteps(withTechnical).map((step) => [step.number, step.stop, step.label]),
    ).toEqual([
      [1, 1, "Opening"],
      [2, 2, "Technical · Project deep-dive"],
      [3, 2, "Technical · System design"],
      [4, 3, "Behavioral"],
      [5, 3, "Behavioral"],
      [6, 4, "Closing"],
    ]);
  });

  it("puts the technical round last when the pack has only early rounds, and skips an empty one", () => {
    const early = { ...prep, questions: prep.questions.filter((item) => item.round === "opening") };
    expect(prepStops({ ...early, technical: TECHNICAL }).map((group) => group.round)).toEqual([
      "opening",
      "technical",
    ]);
    expect(
      prepStops({ ...early, technical: { ...TECHNICAL, questions: [] } }).map(
        (group) => group.round,
      ),
    ).toEqual(["opening"]);
  });
});

describe("prepToText with a technical round", () => {
  it("writes the focus, each question's notes and the resume line it builds on", () => {
    const text = prepToText(
      { ...PREP, technical: TECHNICAL },
      { company: "Mapline", role: "Data Engineer" },
    );
    expect(text).toContain("Round 2 · Technical (Backend engineer · Senior)");
    expect(text).toContain(
      "2. [Project deep-dive · Idempotent retries] You rebuilt billing in Go. How did you make retries safe to repeat?",
    );
    expect(text).toContain('   From your resume: "Rebuilt billing in Go" (Engineer at Acme)');
    expect(text).toContain(
      "   What a strong answer covers:\n   - Idempotency keys under a unique constraint",
    );
    expect(text).toContain("   Follow-up probes:\n   - What if the worker dies mid-charge?");
    expect(text).toContain(
      "3. [System design · Rate limiter] Design a rate limiter for our public API.\n   Assume about 1 million users.",
    );
  });
});
