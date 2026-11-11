import { describe, expect, it } from "vitest";
import { OTTO } from "@/components/mascot/lines";
import { ApiClientError, isBudgetReached } from "@/lib/api/client";
import { FixRequestSchema } from "@/lib/api/types";
import {
  buildAnswers,
  FIX_ANSWER_LIMITS,
  fixAllowanceText,
  fixErrorMessage,
  hasPlaceholders,
  problemMessage,
  splitPlaceholders,
  splitMarks,
} from "./fix-text";

describe("placeholders", () => {
  it("splits a suggestion into plain text and [blanks]", () => {
    expect(splitPlaceholders("Cut costs [X%] for [number] clients.")).toEqual([
      { text: "Cut costs ", placeholder: false },
      { text: "[X%]", placeholder: true },
      { text: " for ", placeholder: false },
      { text: "[number]", placeholder: true },
      { text: " clients.", placeholder: false },
    ]);
    expect(splitPlaceholders("No blanks here")).toEqual([
      { text: "No blanks here", placeholder: false },
    ]);
    expect(splitPlaceholders("")).toEqual([]);
  });

  it("only counts complete, non-empty brackets as blanks", () => {
    expect(hasPlaceholders("Grew sales [X%]")).toBe(true);
    expect(hasPlaceholders("Grew sales [] and [ ")).toBe(false);
  });
});

describe("buildAnswers", () => {
  it("sends only answered questions, trimmed", () => {
    expect(buildAnswers(["How many?", "How fast?"], ["  12 ", ""])).toEqual([
      { question: "How many?", answer: "12" },
    ]);
  });

  it("stays inside what the fix API accepts", () => {
    const questions = Array.from({ length: 8 }, (_, i) => `${"Q".repeat(400)} ${i}`);
    const answers = questions.map(() => "A".repeat(900));
    const built = buildAnswers(questions, answers);
    expect(built).toHaveLength(FIX_ANSWER_LIMITS.count);
    const body = { bullet: "Led a team", role: { title: "", company: "" }, answers: built };
    expect(FixRequestSchema.safeParse(body).success).toBe(true);
  });

  it("matches the API's caps exactly", () => {
    const answer = (length: number) => ({
      bullet: "Led a team",
      role: { title: "", company: "" },
      answers: [
        { question: "Q".repeat(FIX_ANSWER_LIMITS.questionChars), answer: "A".repeat(length) },
      ],
    });
    expect(FixRequestSchema.safeParse(answer(FIX_ANSWER_LIMITS.answerChars)).success).toBe(true);
    expect(FixRequestSchema.safeParse(answer(FIX_ANSWER_LIMITS.answerChars + 1)).success).toBe(
      false,
    );
  });
});

describe("messages", () => {
  it("maps errors to Otto's plain lines", () => {
    expect(fixErrorMessage(new ApiClientError("network_error", "x", 0))).toBe(OTTO.errors.offline);
    expect(fixErrorMessage(new ApiClientError("rate_limited", "x", 429))).toBe(
      OTTO.errors.rateLimited,
    );
    expect(fixErrorMessage(new ApiClientError("ai_unavailable", "x", 502))).toBe(
      OTTO.errors.aiUnavailable,
    );
    expect(fixErrorMessage(new ApiClientError("server_error", "x", 500))).toBe(OTTO.errors.generic);
    expect(fixErrorMessage(new Error("boom"))).toBe(OTTO.errors.generic);
  });

  it("explains a problem the account gate already handled", () => {
    expect(problemMessage({ kind: "limit" }, 20)).toBe(OTTO.limit.reached("fix", 20));
    expect(problemMessage({ kind: "signin" }, 20)).toBe(OTTO.signIn.reason("fix"));
    expect(problemMessage({ kind: "error", message: "Nope" }, 20)).toBe("Nope");
  });

  it("says it was the AI budget, not the line fixes, when that ran out", () => {
    const period = { kind: "month", resetsAt: Date.UTC(2026, 11, 4, 12) } as const;
    expect(problemMessage({ kind: "limit", budget: true }, 20, false, period)).toMatch(
      /^You've used this month's AI budget\. It resets on Dec [45]\.$/,
    );
    const error = new ApiClientError("limit_reached", "Budget", 429, "ai_budget");
    expect(isBudgetReached(error)).toBe(true);
    expect(isBudgetReached(new ApiClientError("limit_reached", "Fixes", 429))).toBe(false);
  });

  it("stops asking for an account once the user has signed back in", () => {
    expect(problemMessage({ kind: "signin" }, 20, true)).toBe(OTTO.fix.signedInAgain);
    expect(problemMessage({ kind: "signin" }, 20, false)).toBe(OTTO.signIn.reason("fix"));
    expect(problemMessage({ kind: "limit" }, 20, true)).toBe(OTTO.limit.reached("fix", 20));
  });

  it("shows what's left on paid plans and the trial, and what Pro adds on Free", () => {
    expect(fixAllowanceText({ used: 0, limit: 0 }, "free")).toBe(
      "Line fixes come with Pro. Try it free for 3 days.",
    );
    expect(fixAllowanceText({ used: 0, limit: 0 }, "free", null, false)).toBe(
      "Line fixes come with Pro.",
    );
    expect(fixAllowanceText({ used: 3, limit: 300 }, "pro")).toBe("297 of 300 fixes left this month");
    expect(fixAllowanceText({ used: 300, limit: 300 }, "pro")).toBe(
      "No fixes left this month. They reset when your plan renews.",
    );
    expect(fixAllowanceText({ used: 3, limit: 50 }, "pro", { kind: "trial", resetsAt: Date.UTC(2026, 10, 11, 12) })).toBe(
      "47 of 50 fixes left this trial",
    );
    expect(fixAllowanceText(null, "free")).toBeNull();
  });
});

describe("splitMarks", () => {
  it("marks each flagged phrase once, ignoring case, in reading order", () => {
    expect(splitMarks("Responsible for various things", ["various", "responsible for"])).toEqual([
      { text: "Responsible for", marked: true },
      { text: " ", marked: false },
      { text: "various", marked: true },
      { text: " things", marked: false },
    ]);
  });

  it("skips blanks, misses and overlaps, and stops at three marks", () => {
    expect(splitMarks("Led a team", ["", "  ", "missing", "Led a", "a team"])).toEqual([
      { text: "Led a", marked: true },
      { text: " team", marked: false },
    ]);
    const marked = splitMarks("a b c d e", ["a", "b", "c", "d"]).filter((part) => part.marked);
    expect(marked.map((part) => part.text)).toEqual(["a", "b", "c"]);
  });

  it("returns the whole line unmarked when nothing was flagged", () => {
    expect(splitMarks("Grew sales 20%", [])).toEqual([{ text: "Grew sales 20%", marked: false }]);
  });
});
