import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getDb } from "@/db/client";
import { notifications, userSettings } from "@/db/schema";
import { createUser, resetDb } from "@/lib/auth/test-helpers";
import { resetEnvForTests } from "@/lib/env";
import type { BatchResult, EmailMessage, EmailSender } from "@/lib/notifications/email";
import { emailMessages } from "@/lib/notifications/locale";
import { DAY_MS } from "@/lib/time";
import { checkinEmail, checkinNotice } from "./checkin-email";
import { runCareerCheckins } from "./checkins";
import { PROMPTS } from "./entry";
import { readSettings, saveSettings, stopCheckinEmails } from "./records";
import { ENTRY_FIELDS } from "./types";

// Opted in on Sunday 22 November 2026; the first Monday of December is the 7th.
const OPTED_IN = Date.UTC(2026, 10, 22, 12);
// 12:30 UTC on Monday 7 December, when the daily run goes.
const RUN = Date.UTC(2026, 11, 7, 12, 30);
// The run the day before, 12:30 UTC on Sunday the 6th: already the 7th past UTC+11:30.
const RUN_BEFORE = Date.UTC(2026, 11, 6, 12, 30);

const context = (now: number) => ({ now, deadline: Date.now() + 30_000 });

function fakeSender(
  answer?: (count: number) => BatchResult,
): EmailSender & { messages: EmailMessage[] } {
  const messages: EmailMessage[] = [];
  return {
    messages,
    async sendBatch(batch) {
      messages.push(...batch);
      return answer ? answer(batch.length) : { sent: batch.length, failed: 0 };
    },
  };
}

async function bell(userId: string) {
  const db = await getDb();
  return db
    .select({ kind: notifications.kind, title: notifications.title, link: notifications.link })
    .from(notifications)
    .where(eq(notifications.userId, userId));
}

async function optIn(email: string, timeZone: string) {
  const user = await createUser(email);
  await saveSettings(user.id, { checkins: true, timeZone }, OPTED_IN);
  return user;
}

beforeEach(async () => {
  await resetDb();
  process.env.CRON_SECRET = "test-cron-secret-0123456789";
  process.env.NEXT_PUBLIC_APP_URL = "https://otto.test";
  resetEnvForTests();
});

afterEach(() => {
  delete process.env.CRON_SECRET;
  resetEnvForTests();
});

describe("the monthly check-in", () => {
  it("rings the bell and emails on the chosen day in each person's zone, once", async () => {
    const auckland = await optIn("kiri@example.com", "Pacific/Auckland");
    const london = await optIn("ada@example.com", "Europe/London");
    const sender = fakeSender();

    const early = await runCareerCheckins(context(RUN_BEFORE), { sender });
    expect(early.failed).toEqual([]);
    expect(await bell(auckland.id)).toEqual([
      {
        kind: "career_checkin",
        title: "Your November check-in",
        link: "/dashboard/career-log/check-in?month=2026-11",
      },
    ]);
    expect(await bell(london.id)).toEqual([]);
    expect(sender.messages.map((message) => message.to)).toEqual(["kiri@example.com"]);

    await runCareerCheckins(context(RUN), { sender });
    await runCareerCheckins(context(RUN + 60_000), { sender });
    expect(await bell(auckland.id)).toHaveLength(1);
    expect(await bell(london.id)).toHaveLength(1);
    expect(sender.messages.map((message) => message.to).sort()).toEqual([
      "ada@example.com",
      "kiri@example.com",
    ]);
    expect(await readSettings(london.id, RUN)).toMatchObject({ nextCheckinOn: "2027-01-04" });
  });

  it("writes an email with the three prompts, the page link and its own unsubscribe", async () => {
    const ada = await optIn("ada@example.com", "Europe/London");
    const sender = fakeSender();
    await runCareerCheckins(context(RUN), { sender });
    const [message] = sender.messages;
    expect(message?.subject).toBe("Your one-minute November check-in");
    expect(message?.text).toContain("What did you ship or improve?");
    expect(message?.text).toContain("Any numbers?");
    expect(message?.text).toContain("Anything you learned or led?");
    expect(message?.text).toContain(
      "https://otto.test/dashboard/career-log/check-in?month=2026-11&utm_source=otto&utm_medium=email&utm_campaign=career_checkin&utm_content=checkin",
    );
    expect(message?.headers?.["List-Unsubscribe"]).toContain(`u=${ada.id}`);
    expect(message?.headers?.["List-Unsubscribe"]).toContain("l=career");
    expect(message?.tags).toEqual([{ name: "kind", value: "career_checkin" }]);
  });

  it("rings and emails in the account's language", async () => {
    const ada = await optIn("ada@example.com", "Europe/London");
    await (
      await getDb()
    )
      .update(userSettings)
      .set({ locale: "fr" })
      .where(eq(userSettings.userId, ada.id));
    const sender = fakeSender();
    await runCareerCheckins(context(RUN), { sender });
    expect(await bell(ada.id)).toMatchObject([{ title: "Ton bilan pour novembre" }]);
    const [message] = sender.messages;
    expect(message?.subject).toBe("Ton bilan pour novembre, en une minute");
    expect(message?.text).toContain("Qu'as-tu livré ou amélioré ?");
    // French is live, so its app links carry /fr: the proxy keeps the reader in French.
    expect(message?.text).toContain(
      "https://otto.test/fr/dashboard/career-log/check-in?month=2026-11",
    );
  });

  it("skips while paused and asks on the first day after", async () => {
    const ada = await optIn("ada@example.com", "Europe/London");
    await saveSettings(ada.id, { pauseMonths: 1 }, OPTED_IN);
    const sender = fakeSender();
    const run = await runCareerCheckins(context(RUN), { sender });
    expect(run.stats).toMatchObject({ bells: 0, skipped: 1 });
    expect(await bell(ada.id)).toEqual([]);
    expect(await readSettings(ada.id, RUN)).toMatchObject({ nextCheckinOn: "2027-01-04" });

    await runCareerCheckins(context(Date.UTC(2027, 0, 4, 12, 30)), { sender });
    expect(await bell(ada.id)).toEqual([
      expect.objectContaining({ title: "Your December check-in" }),
    ]);
  });

  it("keeps the bell when the email is turned off, and asks nobody who turned it off", async () => {
    const ada = await optIn("ada@example.com", "Europe/London");
    const sam = await optIn("sam@example.com", "Europe/London");
    await stopCheckinEmails(ada.id);
    await saveSettings(sam.id, { checkins: false }, OPTED_IN);
    const sender = fakeSender();
    await runCareerCheckins(context(RUN), { sender });
    expect(await bell(ada.id)).toHaveLength(1);
    expect(await bell(sam.id)).toEqual([]);
    expect(sender.messages).toEqual([]);
  });

  it("tries an email again when the provider took none of the batch", async () => {
    const ada = await optIn("ada@example.com", "Europe/London");
    const refused = fakeSender((count) => ({ sent: 0, failed: count, refused: true }));
    const first = await runCareerCheckins(context(RUN), { sender: refused });
    expect(first.stats).toMatchObject({ bells: 1, released: 1 });
    const sender = fakeSender();
    await runCareerCheckins(context(RUN + DAY_MS), { sender });
    expect(sender.messages.map((message) => message.to)).toEqual(["ada@example.com"]);
    expect(await bell(ada.id)).toHaveLength(1);
    const [row] = await (
      await getDb()
    )
      .select({ month: userSettings.careerEmailedMonth })
      .from(userSettings)
      .where(eq(userSettings.userId, ada.id));
    expect(row?.month).toBe("2026-11");
  });

  it("still rings the bell when email isn't set up", async () => {
    const ada = await optIn("ada@example.com", "Europe/London");
    const run = await runCareerCheckins(context(RUN), { sender: null });
    expect(run.stats).toMatchObject({ bells: 1, emailOff: 1 });
    expect(await bell(ada.id)).toHaveLength(1);
  });
});

describe("checkinEmail", () => {
  it("escapes nothing it shouldn't and names the month", () => {
    const message = checkinEmail({
      to: "ada@example.com",
      month: "2026-12",
      url: "https://otto.test/dashboard/career-log/check-in?month=2026-12",
      links: {
        ottoHeadUrl: "https://otto.test/email/otto-head.png",
        settingsUrl: "https://otto.test/dashboard/account#career-log",
        unsubscribeUrl: null,
      },
      locale: "en",
    });
    expect(message.subject).toBe("Your one-minute December check-in");
    expect(message.html).toContain("Write my check-in");
    expect(message.text).toContain("Nothing new this month? That's one tap on the page.");
  });

  it("asks the same three questions as the check-in page, in English", () => {
    const { prompts } = emailMessages("en").checkin;
    for (const field of ENTRY_FIELDS) {
      expect(prompts[field]).toEqual({ label: PROMPTS[field].label, hint: PROMPTS[field].hint });
    }
  });

  it("writes in the account's language, month and footer included", () => {
    const message = checkinEmail({
      to: "ada@example.com",
      month: "2026-12",
      url: "https://otto.test/c",
      links: {
        ottoHeadUrl: "https://otto.test/email/otto-head.png",
        settingsUrl: "https://otto.test/dashboard/account#career-log",
        unsubscribeUrl: "https://otto.test/api/notifications/unsubscribe?l=career",
      },
      locale: "es",
    });
    expect(message.subject).toBe("Tu repaso de diciembre en un minuto");
    expect(message.text).toContain("- ¿Algún número? Usuarios, %, dinero, tiempo ahorrado.");
    expect(message.text).toContain("Escribir mi repaso: https://otto.test/c");
    expect(message.text).toContain(
      "Cancela la suscripción con un clic: https://otto.test/api/notifications/unsubscribe?l=career",
    );
    expect(message.html).toContain(">Cancelar suscripción</a> · <a");
    expect(message.html).toContain("Otto, de Otto Sensei");
    expect(checkinNotice("2026-12", "de").title).toBe("Dein Monatsrückblick für Dezember");
  });
});
