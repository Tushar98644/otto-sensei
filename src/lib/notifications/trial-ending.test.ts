import { describe, expect, it } from "vitest";
import { trialEndingEmail, trialEndingNotice, trialEndLabel } from "./trial-ending";

const ENDS = Date.UTC(2026, 10, 17, 14, 0, 0);

describe("trial-ending notice", () => {
  it("names the end in UTC unless a real time zone is given", () => {
    expect(trialEndLabel(ENDS, null, "en")).toBe("Tuesday, November 17 at 14:00 UTC");
    expect(trialEndLabel(ENDS, "", "en")).toBe("Tuesday, November 17 at 14:00 UTC");
    expect(trialEndLabel(ENDS, "Mars/Olympus", "en")).toBe("Tuesday, November 17 at 14:00 UTC");
    expect(trialEndLabel(ENDS, "Australia/Sydney", "en")).toBe(
      "Wednesday, November 18 at 01:00 GMT+11",
    );
  });

  it("dates the title in the same zone as the body", () => {
    const notice = trialEndingNotice(
      { plan: "pro", interval: "month", endsAt: ENDS, timeZone: "Australia/Sydney" },
      "en",
    );
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
      locale: "en",
    });
    expect(email.subject).toBe("Your Max trial ends on November 17");
    expect(email.text).toContain("Max costs $278/year");
    expect(email.text).toContain("Your account: https://otto.test/account?a=1&b=2");
    expect(email.html).toContain('href="https://otto.test/account?a=1&amp;b=2"');
    expect(email.html).toContain("If you&#39;d like to keep Max");
    expect(email.text).not.toMatch(/unsubscribe/i);
  });

  it("writes the day, time and price the reader's way, still in US dollars", () => {
    expect(trialEndLabel(ENDS, null, "es")).toBe("martes, 17 de noviembre a las 14:00 UTC");
    expect(trialEndLabel(ENDS, null, "de")).toBe("Dienstag, 17. November um 14:00 UTC");
    const email = trialEndingEmail({
      plan: "max",
      interval: "year",
      endsAt: ENDS,
      timeZone: null,
      to: "maya@example.com",
      accountUrl: "https://otto.test/account",
      ottoHeadUrl: "https://otto.test/email/otto-head.png",
      locale: "es",
    });
    expect(email.subject).toBe("Tu prueba de Max termina el 17 de noviembre");
    expect(email.text).toMatch(/Max cuesta USD\s278 al año \(en dólares estadounidenses/);
    expect(email.text).toContain("Tu cuenta: https://otto.test/account");
    expect(email.html).toContain(">Ir a tu cuenta</a>");
    expect(email.text).toContain("Otto, de Otto Sensei");
    const notice = trialEndingNotice(
      { plan: "pro", interval: "month", endsAt: ENDS, timeZone: null },
      "pt-BR",
    );
    expect(notice.title).toBe("Seu teste do Pro termina em 17 de novembro");
    expect(notice.body).toMatch(/^Ele termina terça-feira, 17 de novembro às 14:00 UTC\./);
  });
});
