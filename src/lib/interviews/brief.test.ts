import { describe, expect, it } from "vitest";
import type { InterviewPrep } from "@/lib/insights/prep";
import { briefOf, storyLine } from "./brief";

type Question = InterviewPrep["questions"][number];

const QUESTION: Omit<Question, "question"> = {
  round: "fit",
  checking: "",
  followUp: "",
  points: [],
  story: null,
};

const PREP: InterviewPrep = {
  version: 2,
  job: { title: "Product Designer", company: "Stripe" },
  questions: [
    { ...QUESTION, question: "Why Stripe?" },
    { ...QUESTION, question: "Walk me through a launch.", story: 0 },
    { ...QUESTION, question: "How do you handle pushback?" },
    { ...QUESTION, question: "A fourth one" },
  ],
  stories: [
    {
      title: "The checkout redesign",
      line: "Cut checkout steps from 5 to 2",
      place: "",
      situation: "",
      task: "",
      action: "",
      result: "",
    },
  ],
  asks: ["What does success look like in 90 days?", " ", "How does design work with engineering?"],
  createdAt: 1,
  demo: false,
};

describe("the interview-day brief", () => {
  it("takes the pack's strongest stories, likely questions and questions to ask, three of each", () => {
    expect(briefOf(PREP)).toEqual({
      stories: ["The checkout redesign: Cut checkout steps from 5 to 2"],
      questions: ["Why Stripe?", "Walk me through a launch.", "How do you handle pushback?"],
      asks: ["What does success look like in 90 days?", "How does design work with engineering?"],
    });
  });

  it("puts the opener and the wrap-up last", () => {
    const opener: Question = {
      ...QUESTION,
      round: "opening",
      question: "Walk me through your background.",
    };
    const brief = briefOf({ ...PREP, questions: [opener, ...PREP.questions] });
    expect(brief.questions).not.toContain("Walk me through your background.");
  });

  it("reads each story once when its title only repeats the line's start", () => {
    expect(
      storyLine({
        title: "Cut support tickets by 30%",
        line: "Cut support tickets by 30% by rewriting errors",
      }),
    ).toBe("Cut support tickets by 30% by rewriting errors");
    expect(storyLine({ title: "Checkout", line: "Cut checkout steps" })).toBe(
      "Checkout: Cut checkout steps",
    );
  });
});
