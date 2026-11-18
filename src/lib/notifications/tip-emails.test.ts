import { describe, expect, it } from "vitest";
import { TIP_EMAIL_KINDS } from "./types";
import { tipEmail, type TipEmailInput } from "./tip-emails";

const input = (overrides: Partial<TipEmailInput>): TipEmailInput => ({
  to: "maya@example.com",
  kind: "no_resume",
  trialEndsAt: null,
  timeZone: null,
  month: Date.UTC(2026, 11, 2),
  urls: {
    resumes: "https://otto.test/dashboard/resumes",
    jobs: "https://otto.test/dashboard/jobs",
    plans: "https://otto.test/pricing",
  },
  links: {
    ottoHeadUrl: "https://otto.test/email/otto-head.png",
    settingsUrl: "https://otto.test/dashboard/account#reminders",
    unsubscribeUrl: "https://otto.test/api/notifications/unsubscribe?u=1&t=2&l=tips",
  },
  ...overrides,
});

describe("tipEmail", () => {
  it("gives every kind a subject, a button, its tag and the one-click unsubscribe", () => {
    for (const kind of TIP_EMAIL_KINDS) {
      const message = tipEmail(input({ kind }));
      expect(message.subject.length).toBeGreaterThan(10);
      expect(message.tags).toEqual([{ name: "kind", value: kind }]);
      expect(message.headers?.["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click");
      expect(message.text).toContain(
        "Unsubscribe in one click: https://otto.test/api/notifications/unsubscribe",
      );
      expect(message.text).toContain("tips and reminders are on");
    }
  });

  it("names the month the line fixes came back in, and the day a trial ended in the account's zone", () => {
    expect(tipEmail(input({ kind: "fixes_back" })).text).toContain(
      "It's December, so your 3 free line fixes with Otto are back.",
    );
    const ended = tipEmail(
      input({
        kind: "trial_ended",
        trialEndsAt: Date.UTC(2026, 11, 3, 2),
        timeZone: "America/Los_Angeles",
      }),
    );
    expect(ended.subject).toBe("Your Pro trial has ended");
    expect(ended.text).toContain("ended on December 2, and your account is on Free now.");
    expect(ended.text).toContain("See plans: https://otto.test/pricing");
  });
});
