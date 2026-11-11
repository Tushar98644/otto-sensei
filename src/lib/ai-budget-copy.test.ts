import { describe, expect, it } from "vitest";
import { AI_TOKEN_BUDGETS } from "@/config/plans";
import { aiBudgetLine, budgetReachedText, tokenCount, tokensInWords } from "./ai-budget-copy";

const MONTHLY = { kind: "month", resetsAt: Date.UTC(2026, 11, 4, 9, 30), renews: true } as const;
const YEARLY = { kind: "month", resetsAt: Date.UTC(2026, 11, 4, 9, 30), renews: false } as const;
const TRIAL = { kind: "trial", resetsAt: Date.UTC(2026, 10, 14, 12) } as const;
const WEEK = { kind: "week", resetsAt: Date.UTC(2026, 10, 19, 9, 30) } as const;

describe("AI budget copy", () => {
  it("writes token counts short and round", () => {
    expect(tokenCount(1_234_567)).toBe("1.2M");
    expect(tokenCount(5_000_000)).toBe("5M");
    expect(tokenCount(500_000)).toBe("500K");
    expect(tokenCount(0)).toBe("0");
  });

  it("writes the budgets in words for the terms", () => {
    expect(tokensInWords(AI_TOKEN_BUDGETS.pro)).toBe("5 million");
    expect(tokensInWords(AI_TOKEN_BUDGETS.max)).toBe("10 million");
    expect(tokensInWords(AI_TOKEN_BUDGETS.trial)).toBe("half a million");
  });

  it("is one quiet line on the account page", () => {
    expect(aiBudgetLine({ used: 1_200_000, limit: 5_000_000 }, MONTHLY)).toBe(
      "AI budget: 1.2M of 5M used this month",
    );
    expect(aiBudgetLine({ used: 42_000, limit: 500_000 }, TRIAL)).toBe(
      "AI budget: 42K of 500K used this trial",
    );
  });

  it("says when a used-up budget resets", () => {
    expect(budgetReachedText(MONTHLY, "UTC")).toBe(
      "You've used this month's AI budget. It resets on Dec 4.",
    );
    expect(budgetReachedText(YEARLY, "UTC")).toBe(
      "You've used this month's AI budget. It resets on Dec 4.",
    );
    expect(budgetReachedText(WEEK, "UTC")).toBe(
      "You've used this week's AI budget. It resets on Nov 19.",
    );
    expect(budgetReachedText(null)).toBe(
      "You've used this month's AI budget. It resets when your plan renews.",
    );
  });

  it("tells a trial when its full allowance starts", () => {
    expect(budgetReachedText(TRIAL, "UTC")).toBe(
      "You've used this trial's AI budget. Your full allowance starts on Nov 14.",
    );
  });
});
