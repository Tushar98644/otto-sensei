import { describe, expect, it } from "vitest";
import { greenhousePosting } from "./boards";
import { greenhouseQuestions } from "./questions";
import { GREENHOUSE_JOB } from "./test-fixtures";

const QUESTIONS = [
  { label: "First Name", required: true, fields: [{ name: "first_name", type: "input_text", values: [] }] },
  {
    label: "Resume/CV",
    required: true,
    fields: [
      { name: "resume", type: "input_file", values: [] },
      { name: "resume_text", type: "textarea", values: [] },
    ],
  },
  {
    label: "Will you now or in the future require sponsorship for a visa to remain in your current location?",
    required: true,
    fields: [
      {
        name: "question_37369961002",
        type: "multi_value_single_select",
        values: [
          { label: "No", value: 1 },
          { label: "Yes, EU Blue Card", value: 2 },
          { label: "Yes, F-1 Visa OPT (USA)", value: 3 },
        ],
      },
    ],
  },
  {
    label: "Have you previously worked at or consulted for GitLab?",
    required: true,
    fields: [
      {
        name: "question_37369962002",
        type: "multi_value_single_select",
        values: [
          { label: "Yes", value: 1 },
          { label: "No", value: 0 },
        ],
      },
    ],
  },
  {
    label: "What is your current country of residence?",
    required: false,
    fields: [
      {
        name: "question_37369963002",
        type: "multi_value_single_select",
        values: ["Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Argentina", "Armenia", "Australia"].map(
          (label, value) => ({ label, value }),
        ),
      },
    ],
  },
  {
    label: "Which of these do you use &amp; enjoy?",
    required: false,
    fields: [
      {
        name: "question_9",
        type: "multi_value_multi_select",
        values: [{ label: "Go" }, { label: "Ruby" }],
      },
    ],
  },
  { label: "Broken", fields: "nope" },
  { label: "No choices", required: true, fields: [{ type: "multi_value_single_select", values: [] }] },
];

describe("greenhouseQuestions", () => {
  it("keeps only yes/no and pick-from-a-list questions, in order", () => {
    expect(greenhouseQuestions(QUESTIONS)).toEqual([
      {
        label: "Will you now or in the future require sponsorship for a visa to remain in your current location?",
        required: true,
        kind: "single",
        options: ["No", "Yes, EU Blue Card", "Yes, F-1 Visa OPT (USA)"],
        optionCount: 3,
      },
      {
        label: "Have you previously worked at or consulted for GitLab?",
        required: true,
        kind: "yes_no",
        options: ["Yes", "No"],
        optionCount: 2,
      },
      {
        label: "What is your current country of residence?",
        required: false,
        kind: "single",
        options: ["Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Argentina"],
        optionCount: 8,
      },
      {
        label: "Which of these do you use & enjoy?",
        required: false,
        kind: "multi",
        options: ["Go", "Ruby"],
        optionCount: 2,
      },
    ]);
  });

  it("returns nothing for a form it can't read", () => {
    expect(greenhouseQuestions(undefined)).toEqual([]);
    expect(greenhouseQuestions({ questions: [] })).toEqual([]);
  });

  it("caps a very long form", () => {
    const many = Array.from({ length: 30 }, (_, index) => ({
      label: `Question ${index}?`,
      fields: [{ type: "multi_value_single_select", values: [{ label: "Yes" }, { label: "No" }] }],
    }));
    expect(greenhouseQuestions(many)).toHaveLength(12);
  });
});

describe("greenhousePosting with questions", () => {
  const link = new URL("https://example.com/job");

  it("adds the form's screening questions to the posting", () => {
    const posting = greenhousePosting({ ...GREENHOUSE_JOB, questions: QUESTIONS }, "gitlab", link);
    expect(posting.questions?.map((question) => question.kind)).toEqual(["single", "yes_no", "single", "multi"]);
  });

  it("leaves the field out when the form has none", () => {
    expect(greenhousePosting(GREENHOUSE_JOB, "gitlab", link)).not.toHaveProperty("questions");
  });
});
