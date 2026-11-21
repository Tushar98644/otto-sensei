import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FixResult } from "@/lib/ai/types";
import { resetEnvForTests } from "@/lib/env";
import { dryRun, validateSuite } from "../../../scripts/evals/harness";
import { fixSuite } from "../../../scripts/evals/suites/fix";
import { FIX_CASES } from "../../../scripts/evals/suites/fix/cases";
import {
  aiTells,
  avoidedClaims,
  cleanLine,
  inventedNumbers,
  keptFacts,
  keptNumbers,
  needsAnswers,
  noClaimUpgrade,
  noFirstPerson,
  noStockPhrases,
  novelWords,
  placeholdersFit,
  questionsFit,
  schemaGrade,
  strongStart,
  suggestionLength,
  unbackedDetails,
  type FixCase,
  type FixExpect,
} from "../../../scripts/evals/suites/fix/graders";

function kase(
  bullet: string,
  expect?: FixExpect,
  answers: FixCase["input"]["answers"] = [],
): FixCase {
  return {
    id: "test",
    input: {
      bullet,
      role: { title: "Support Specialist", company: "Brightwell Outfitters" },
      answers,
    },
    expect,
  };
}

function out(suggestion: string, overrides: Partial<FixResult> = {}): FixResult {
  return { issues: ["Weak start"], questions: [], suggestion, needsAnswers: false, ...overrides };
}

const ANSWERED = [{ question: "How many?", answer: "About 40 a day" }];

describe("fix suite", () => {
  it("is valid and every golden passes every grader", () => {
    expect(validateSuite(fixSuite)).toEqual([]);
    const [checked] = dryRun([fixSuite]);
    expect(checked?.problems).toEqual([]);
    expect(checked?.cases.every((entry) => entry.grades !== null)).toBe(true);
  });

  it("has 15 to 25 cases", () => {
    expect(FIX_CASES.length).toBeGreaterThanOrEqual(15);
    expect(FIX_CASES.length).toBeLessThanOrEqual(25);
  });

  it("sends tailor-page lines the way the app does: the text is both the line and the answer", () => {
    const tailored = FIX_CASES.find((entry) => entry.id === "tailor-line-not-a-fit");
    expect(tailored?.input.answers).toEqual([
      {
        question: "Have you run Kubernetes in production? Where, and what did you do?",
        answer: tailored?.input.bullet,
      },
    ]);
  });
});

describe("fix suite run", () => {
  const fetchMock =
    vi.fn<(input: string | URL | Request, init?: RequestInit) => Promise<Response>>();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(console, "info").mockImplementation(() => {});
  });

  afterEach(() => {
    delete process.env.OPENROUTER_API_KEY;
    resetEnvForTests();
    fetchMock.mockReset();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("refuses to run without a key instead of grading the offline demo", async () => {
    delete process.env.OPENROUTER_API_KEY;
    resetEnvForTests();
    await expect(fixSuite.run(FIX_CASES[0]!, "lab/model-a")).rejects.toThrow(/OPENROUTER_API_KEY/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("calls the real fixBullet, so its number guard still applies", async () => {
    process.env.OPENROUTER_API_KEY = "test-key";
    resetEnvForTests();
    fetchMock.mockImplementation(async (input) => {
      expect(String(input)).toBe("https://openrouter.ai/api/v1/chat/completions");
      const content = JSON.stringify({
        issues: ["Starts with a duty"],
        questions: [],
        suggestion: "Answered 500 customer emails and chats a week in Zendesk.",
      });
      return Response.json({
        choices: [{ finish_reason: "stop", message: { content } }],
        usage: { prompt_tokens: 50, completion_tokens: 10, total_tokens: 60 },
      });
    });
    const result = (await fixSuite.run(FIX_CASES[0]!, "lab/model-a")) as FixResult;
    expect(result.suggestion).toBe("Answered [number] customer emails and chats a week in Zendesk");
    expect(result.needsAnswers).toBe(true);
    expect(result.questions).toEqual(["What should go in [number]?"]);
    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)) as {
      messages: { content: unknown }[];
    };
    expect(JSON.stringify(body.messages)).toContain(
      "Responsible for answering customer emails and chats in Zendesk",
    );
  });
});

describe("schema and length", () => {
  it("accepts the product's shape, including no issues for a line that is already good", () => {
    expect(schemaGrade(out("Cut costs 20%", { issues: [] })).pass).toBe(true);
  });

  it("rejects more than 3 issues and an empty suggestion", () => {
    expect(schemaGrade(out("Cut costs", { issues: ["a", "b", "c", "d"] })).pass).toBe(false);
    expect(schemaGrade(out("")).pass).toBe(false);
  });

  it("keeps the suggestion under 30 words", () => {
    const words = (count: number) =>
      `Led ${Array.from({ length: count - 1 }, () => "teams").join(" ")}`;
    const [chars, short] = suggestionLength(out(words(29)));
    expect(chars?.pass).toBe(true);
    expect(short?.pass).toBe(true);
    expect(suggestionLength(out(words(30)))[1]?.pass).toBe(false);
  });
});

describe("numbers", () => {
  it("flags a number that isn't in the line or answers, but not a placeholder", () => {
    const line = kase("Answered customer emails");
    expect(inventedNumbers(out("Answered 300 customer emails"), line).pass).toBe(false);
    expect(inventedNumbers(out("Answered [number] customer emails"), line).pass).toBe(true);
    expect(
      inventedNumbers(out("Answered 40 emails a day"), kase("Answered emails", undefined, ANSWERED))
        .pass,
    ).toBe(true);
  });

  it("flags a number from the line or answers that the suggestion drops", () => {
    const line = kase("Cut scrap from 6% to 3.5% for 35 operators");
    const grade = keptNumbers(out("Cut scrap from 6% for 35 operators"), line);
    expect(grade).toMatchObject({ pass: false, detail: "drops 3.5% from the line or answers" });
    expect(keptNumbers(out("Led 35 operators, cutting scrap from 6% to 3.5%"), line).pass).toBe(
      true,
    );
    expect(
      keptNumbers(out("Answered emails"), kase("Answered emails", undefined, ANSWERED)).pass,
    ).toBe(false);
  });

  it("accepts the same number written as a word or a multiple", () => {
    expect(keptNumbers(out("Tripled revenue"), kase("Grew revenue 3x")).pass).toBe(true);
    expect(
      keptNumbers(out("Closed books for twelve entities"), kase("Closed books for 12 entities"))
        .pass,
    ).toBe(true);
  });
});

describe("facts and claims", () => {
  it("needs every listed fact, any one option of a list, ignoring case", () => {
    const line = kase("Answered chats in Zendesk", { keep: ["Zendesk", ["chat", "message"]] });
    expect(keptFacts(out("Answered customer messages in zendesk"), line).pass).toBe(true);
    expect(keptFacts(out("Answered customer emails"), line)).toMatchObject({
      pass: false,
      detail: 'missing "Zendesk", "chat" or "message"',
    });
    expect(keptFacts(out("Anything"), kase("Anything")).pass).toBe(true);
  });

  it("flags a claim the case says to avoid", () => {
    const line = kase("Deployed on Heroku", { avoid: ["Kubernetes"] });
    expect(avoidedClaims(out("Deployed the app on Kubernetes"), line).pass).toBe(false);
    expect(avoidedClaims(out("Deployed the app on Heroku"), line).pass).toBe(true);
  });

  it("flags a lead or ownership verb added to a line that only says the person helped", () => {
    const helped = kase("Assisted the senior accountant with month-end close");
    expect(noClaimUpgrade(out("Led month-end close for the finance team"), helped)).toMatchObject({
      pass: false,
      detail: 'the input only says the person helped, but the suggestion claims "led"',
    });
    expect(
      noClaimUpgrade(out("Supported the senior accountant on month-end close"), helped).pass,
    ).toBe(true);
    expect(noClaimUpgrade(out("Led the close"), kase("Led the month-end close")).pass).toBe(true);
  });

  it("flags when or how often the input never states", () => {
    expect(
      unbackedDetails(out("Posted daily on Instagram"), kase("Posted on Instagram")).pass,
    ).toBe(false);
    expect(
      unbackedDetails(out("Posted daily on Instagram"), kase("posted daily on Instagram")).pass,
    ).toBe(true);
  });
});

describe("strong-start", () => {
  it.each([
    ["Responsible for answering emails", "duty"],
    ["Helped with the billing move", "weak verb"],
    ["The senior accountant's close", "article"],
    ["Managing a team of 6", "-ing form"],
    ["Successfully led a team of 6", "adverb"],
    ["[number] orders packed a shift", "placeholder"],
    ["200 orders packed a shift", "number"],
    ["Upgrades and panel installs on commercial jobs", "plural noun"],
  ])("fails %j (%s)", (suggestion) => {
    expect(strongStart(out(suggestion)).pass).toBe(false);
  });

  it.each([
    "Cut cloud spend 28%",
    "Processed 200 orders",
    "Precepted new nurses",
    "Ran the front desk",
    "Focus on retention",
  ])("passes %j", (suggestion) => {
    expect(strongStart(out(suggestion)).pass).toBe(true);
  });
});

describe("clean-line", () => {
  it.each([
    ["managed accounts for 3 locations", "starts in lowercase"],
    ["Packed 200 orders. Wrote a poem", "2 sentences"],
    ["Packed 200 orders a shift;", 'ends with ";"'],
    ["DESIGNED AND SHIPPED NEW CHECKOUT FLOW", "mostly capitals"],
    ["Managed Instagram,TikTok for 3 locations", 'odd spacing at "m,T"'],
    ["Managed accounts ; posted daily", 'odd spacing at ";"'],
    ["Shipped checkout -> conversion up 11%", 'shorthand "->"'],
  ])("fails %j", (suggestion, detail) => {
    expect(cleanLine(out(suggestion))).toMatchObject({ pass: false, detail });
  });

  it.each([
    "Served 4 years in the U.S. Army as a logistics specialist",
    "Moved 1,200 accounts to Larchmont Inc. Billing in two weeks",
    "Cut EC2 spend 28% with spot capacity",
    "Published a library (github.com/lumenfold/tidydate)",
  ])("passes %j", (suggestion) => {
    expect(cleanLine(out(suggestion)).pass).toBe(true);
  });
});

describe("style", () => {
  it("flags first person, but not US as a country", () => {
    expect(noFirstPerson(out("Led my team of 6")).pass).toBe(false);
    expect(noFirstPerson(out("Opened 3 US stores for the brand")).pass).toBe(true);
  });

  it("flags stock phrases from the linter and the writing guards", () => {
    const line = kase("Did support");
    expect(noStockPhrases(out("Results-driven support lead for 6 teams"), line).pass).toBe(false);
    expect(noStockPhrases(out("Spearheaded the support rota"), line).pass).toBe(false);
    expect(noStockPhrases(out("Ran the support rota for 6 teams"), line).pass).toBe(true);
  });

  it("flags AI tells anywhere in the output", () => {
    expect(aiTells(out("Ran support", { issues: ["As an AI, I can't judge this"] })).pass).toBe(
      false,
    );
    expect(aiTells(out("Ran support")).pass).toBe(true);
  });
});

describe("placeholders and questions", () => {
  it("allows up to 3 short placeholders and no hidden personal details", () => {
    expect(placeholdersFit(out("Sold [products] to [number] customers")).pass).toBe(true);
    expect(placeholdersFit(out("Sold [a] to [b] for [c] at [d]")).pass).toBe(false);
    expect(placeholdersFit(out("Sold [the number of products you sold] to customers")).pass).toBe(
      false,
    );
    expect(placeholdersFit(out("Published a library at [LINK_1]")).pass).toBe(false);
    expect(placeholdersFit(out("Emailed [email_2] each week")).pass).toBe(false);
  });

  it("checks needsAnswers only when the case says what to expect", () => {
    expect(
      needsAnswers(out("Led", { needsAnswers: true }), kase("Led", { needsAnswers: false })).pass,
    ).toBe(false);
    expect(needsAnswers(out("Led", { needsAnswers: true }), kase("Led")).pass).toBe(true);
  });

  it.each<[string, FixResult, FixCase]>([
    [
      "questions after answers",
      out("Answered 40 emails a day", { questions: ["How many?"] }),
      kase("Answered emails", undefined, ANSWERED),
    ],
    [
      "placeholders with no questions",
      out("Answered [number] emails", { needsAnswers: true }),
      kase("Answered emails"),
    ],
    [
      "questions on a complete line",
      out("Cut costs 20%", { questions: ["When?"] }),
      kase("Cut costs 20%", { needsAnswers: false }),
    ],
    [
      "a question without a question mark",
      out("Answered [number] emails", { needsAnswers: true, questions: ["Tell me how many"] }),
      kase("Answered emails"),
    ],
  ])("fails %s", (_label, output, line) => {
    expect(questionsFit(output, line).pass).toBe(false);
  });

  it("passes matching questions and placeholders", () => {
    const output = out("Answered [number] emails", {
      needsAnswers: true,
      questions: ["How many emails?"],
    });
    expect(questionsFit(output, kase("Answered emails")).pass).toBe(true);
    expect(
      questionsFit(out("Answered 40 emails a day"), kase("Answered emails", undefined, ANSWERED))
        .pass,
    ).toBe(true);
  });
});

describe("novel-words", () => {
  it("flags a rewrite made mostly of words the input never used, ignoring placeholders", () => {
    const line = kase("Answered customer emails for the support team");
    expect(
      novelWords(out("Led a cross-functional overhaul of client communication strategy"), line)
        .pass,
    ).toBe(false);
    expect(
      novelWords(
        out("Answered [number of customer emails per week] customer emails for the support team"),
        line,
      ).pass,
    ).toBe(true);
  });

  it("skips lines too short to compare", () => {
    expect(novelWords(out("Sold [products] to [number] customers"), kase("Sales"))).toMatchObject({
      pass: true,
      detail: "the line is too short to compare",
    });
  });
});
