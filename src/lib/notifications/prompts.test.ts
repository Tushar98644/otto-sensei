import { beforeEach, describe, expect, it } from "vitest";
import { createUser, resetDb } from "@/lib/auth/test-helpers";
import { DAY_MS } from "@/lib/time";
import { readEmailChoices, saveEmailChoices } from "./choices";
import { PROMPT_SNOOZE_DAYS, promptResting } from "./prompts";
import { readReminderSettings, snoozeReminderPrompt } from "./records";

const NOW = Date.UTC(2026, 10, 22, 12);

beforeEach(async () => {
  await resetDb();
});

describe("Not now", () => {
  it("rests a card for 30 days", () => {
    expect(promptResting(null, NOW)).toBe(false);
    expect(promptResting(NOW - DAY_MS, NOW)).toBe(true);
    expect(promptResting(NOW - PROMPT_SNOOZE_DAYS * DAY_MS + 1, NOW)).toBe(true);
    expect(promptResting(NOW - PROMPT_SNOOZE_DAYS * DAY_MS, NOW)).toBe(false);
  });

  it("lets the jobs and views cards ask again after the rest, still unanswered", async () => {
    const maya = await createUser("maya@example.com");
    await saveEmailChoices(maya.id, { jobPromptSnoozed: true, viewPromptSnoozed: true }, NOW);
    expect(await readEmailChoices(maya.id, NOW + DAY_MS)).toMatchObject({
      jobEmails: false,
      jobPromptClosed: false,
      jobPromptSnoozed: true,
      viewPromptSnoozed: true,
    });
    expect(await readEmailChoices(maya.id, NOW + 31 * DAY_MS)).toMatchObject({
      jobPromptClosed: false,
      jobPromptSnoozed: false,
      viewPromptClosed: false,
      viewPromptSnoozed: false,
    });
  });

  it("rests the reminders card without choosing for the person", async () => {
    const maya = await createUser("maya@example.com");
    expect(await snoozeReminderPrompt(maya.id, NOW)).toBe(true);
    expect(await readReminderSettings(maya.id, NOW + DAY_MS)).toMatchObject({
      emailReminders: false,
      chosen: false,
      promptSnoozed: true,
    });
    expect(await readReminderSettings(maya.id, NOW + 31 * DAY_MS)).toMatchObject({
      chosen: false,
      promptSnoozed: false,
    });
  });
});
