import { describe, expect, it } from "vitest";
import { byRound, InterviewPrepSchema, readPrep } from "./prep";

const STORY = {
  title: "Billing rebuild",
  line: "Rebuilt billing in Go",
  place: "Engineer at Acme",
  situation: "[What was going on?]",
  task: "[What were you asked to do?]",
  action: "Rebuilt billing in Go",
  result: "[What changed?]",
};

const V1 = {
  version: 1,
  job: { title: "Data Engineer", company: "Mapline" },
  questions: [
    { question: "How do you test a pipeline?", why: "The post asks for dbt." },
    { question: "Tell me about a time a job failed.", why: "" },
  ],
  stories: [STORY],
  asks: ["What does the team ship next?"],
  createdAt: 7,
  demo: false,
};

describe("readPrep", () => {
  it("reads a v1 pack as v2: why becomes checking, under the default round, with no extras", () => {
    expect(readPrep(V1)).toEqual({
      ...V1,
      version: 2,
      questions: [
        {
          round: "fit",
          question: "How do you test a pipeline?",
          checking: "The post asks for dbt.",
          followUp: "",
          points: [],
          story: null,
        },
        {
          round: "fit",
          question: "Tell me about a time a job failed.",
          checking: "",
          followUp: "",
          points: [],
          story: null,
        },
      ],
    });
    expect(InterviewPrepSchema.safeParse(readPrep(V1)).success).toBe(true);
  });

  it("reads v2 as it is and anything else as no pack", () => {
    const v2 = readPrep(V1);
    expect(readPrep(v2)).toEqual(v2);
    expect(readPrep(null)).toBeNull();
    expect(readPrep({ ...V1, version: 3 })).toBeNull();
    expect(readPrep({ ...V1, questions: "junk" })).toBeNull();
  });

  it("refuses a question that points at a story the pack doesn't have", () => {
    const v2 = readPrep(V1);
    if (!v2) throw new Error("setup failed");
    const [first] = v2.questions;
    if (!first) throw new Error("setup failed");
    const dangling = { ...v2, questions: [{ ...first, story: 1 }] };
    expect(InterviewPrepSchema.safeParse(dangling).success).toBe(false);
    expect(InterviewPrepSchema.safeParse({ ...dangling, stories: [STORY, STORY] }).success).toBe(true);
  });
});

describe("byRound", () => {
  it("sorts by round and keeps the order within one", () => {
    const sorted = byRound([
      { round: "closing", id: 1 },
      { round: "skills", id: 2 },
      { round: "opening", id: 3 },
      { round: "skills", id: 4 },
      { round: "behavioural", id: 5 },
      { round: "fit", id: 6 },
    ] as const);
    expect(sorted.map((item) => item.id)).toEqual([3, 6, 2, 4, 5, 1]);
  });
});
