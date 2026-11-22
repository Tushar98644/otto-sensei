import { describe, expect, it } from "vitest";
import { emptyWorkProfile } from "@/lib/eligibility/profile";
import {
  customAnswer,
  emptyAnswers,
  mergeAnswers,
  payText,
  questionKey,
  withWorkProfile,
} from "./answers";

describe("saved answers", () => {
  it("files one question under one key, however it's worded", () => {
    expect(questionKey("Are you at least 18 years of age? *")).toBe(
      questionKey("are you at least 18 years of age"),
    );
    const answers = mergeAnswers(
      emptyAnswers(),
      { custom: [{ question: "Notice? ✱", answer: "2 weeks" }] },
      5,
    );
    expect(customAnswer(answers, "notice")).toBe("2 weeks");
    expect(answers.custom[0]?.at).toBe(5);
  });

  it("merges a part at a time and forgets an emptied question", () => {
    const first = mergeAnswers(
      emptyAnswers(),
      {
        noticePeriod: "30 days",
        workRights: { US: { authorized: true, sponsorship: false } },
        custom: [{ question: "Q one", answer: "a" }],
      },
      1,
    );
    const second = mergeAnswers(
      first,
      {
        workRights: { GB: { authorized: false, sponsorship: true } },
        custom: [{ question: "q ONE", answer: "" }],
      },
      2,
    );
    expect(second.noticePeriod).toBe("30 days");
    expect(Object.keys(second.workRights)).toEqual(["US", "GB"]);
    expect(second.custom).toEqual([]);
  });

  it("puts the work profile's rights beneath what was saved", () => {
    const profile = {
      ...emptyWorkProfile(),
      country: "IN",
      rights: { us: "sponsorship", uk: "authorized", eu: null, ca: null },
    } as const;
    const answers = withWorkProfile(
      { ...emptyAnswers(), workRights: { US: { authorized: true, sponsorship: false } } },
      profile,
    );
    expect(answers.workRights).toEqual({
      IN: { authorized: true, sponsorship: false },
      US: { authorized: true, sponsorship: false },
      GB: { authorized: true, sponsorship: false },
    });
    expect(withWorkProfile(emptyAnswers(), null).workRights).toEqual({});
  });

  it("writes pay the way each form counts it", () => {
    const pay = { amount: 1_800_000, currency: "INR", period: "year" } as const;
    expect(payText(pay)).toBe("₹18,00,000 a year");
    expect(payText(pay, { lakhs: true })).toBe("18");
    expect(payText({ amount: 150_000, currency: "INR", period: "month" }, { lakhs: true })).toBe(
      "18",
    );
    expect(payText({ amount: 120_000, currency: "USD", period: "year" }, { digits: true })).toBe(
      "120000",
    );
    expect(payText({ amount: 5_000, currency: "SGD", period: "month" })).toBe("SGD 5,000 a month");
  });
});
