import { describe, expect, it } from "vitest";
import { trialEndingEmail, trialEndingNotice, trialEndLabel } from "./trial-ending";

const ENDS = Date.UTC(2026, 10, 17, 14, 0, 0);

describe("trial-ending notice", () => {
  it("names the end in UTC unless a real time zone is given", () => {
    expect(trialEndLabel(ENDS, null)).toBe("Tuesday, November 17 at 14:00 UTC");
    expect(trialEndLabel(ENDS, "")).toBe("Tuesday, November 17 at 14:00 UTC");
    expect(trialEndLabel(ENDS, "Mars/Olympus")).toBe("Tuesday, November 17 at 14:00 UTC");
    expect(trialEndLabel(ENDS, "Australia/Sydney")).toBe("Wednesday, November 18 at 01:00 GMT+11");
  });

  it("dates the title in the same zone as the body", () => {
    const notice = trialEndingNotice({
      plan: "pro",
      interval: "month",
      endsAt: ENDS,
      timeZone: "Australia/Sydney",
    });
    expect(notice.title).toBe("Your Pro trial ends on November 18");
    expect(notice.body).toContain("Wednesday, November 18 at 01:00 GMT+11");
    expect(notice.link).toBe("/dashboard/account");
  });

  it("states the plan's own price and escapes what goes into the HTML", () => {
    const email = trialEndingEmail({
      plan: "max",
      interval: "year",
      endsAt: ENDS,
      timeZone: null,
      to: "maya@example.com",
      accountUrl: "https://otto.test/account?a=1&b=2",
      ottoHeadUrl: "https://otto.test/email/otto-head.png",
    });
    expect(email.subject).toBe("Your Max trial ends on November 17");
    expect(email.text).toContain("Max costs $278/year");
    expect(email.text).toContain("Your account: https://otto.test/account?a=1&b=2");
    expect(email.html).toContain('href="https://otto.test/account?a=1&amp;b=2"');
    expect(email.html).toContain("If you&#39;d like to keep Max");
    expect(email.text).not.toMatch(/unsubscribe/i);
  });
});
