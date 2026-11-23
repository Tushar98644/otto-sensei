import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "@/db/client";
import { userSettings } from "@/db/schema";
import { createUser, resetDb } from "@/lib/auth/test-helpers";
import { readWorkProfile } from "@/lib/eligibility/records";
import { readReminderSettings } from "@/lib/notifications/records";
import { readAccountSetup } from "@/lib/setup/records";
import { deleteUserData } from "@/lib/users";
import { readSharedSettings } from "./settings";

const NOW = Date.UTC(2026, 10, 23, 12);

beforeEach(async () => {
  await resetDb();
  vi.restoreAllMocks();
});

describe("readSharedSettings", () => {
  it("tells a missing account from one that saved nothing yet", async () => {
    const maya = await createUser("maya@example.com");
    expect(await readSharedSettings(maya.id)).toEqual({ account: true, settings: null });
    await deleteUserData(maya.id);
    expect(await readSharedSettings(maya.id)).toEqual({ account: false, settings: null });
    expect(await readReminderSettings(maya.id)).toBeNull();
  });

  it("gives each reader its own slice of the one row", async () => {
    const maya = await createUser("maya@example.com");
    const db = await getDb();
    await db.insert(userSettings).values({
      userId: maya.id,
      updatedAt: NOW,
      country: "GB",
      targetTitle: "Product Designer",
      targetFamily: "design",
      workUpdatedAt: NOW - 1,
      setupStepAt: NOW - 2,
      setupStepOutcome: "saved",
      followUpDays: 10,
      emailReminders: true,
      remindersChosen: true,
    });
    const shared = await readSharedSettings(maya.id);
    expect(shared.settings).toMatchObject({ country: "GB", followUpDays: 10 });
    expect(await readWorkProfile(maya.id)).toMatchObject({
      profile: { country: "GB" },
      updatedAt: NOW - 1,
      lookingFor: { role: { title: "Product Designer", family: "design" } },
    });
    expect(await readAccountSetup(maya.id)).toMatchObject({
      stepAt: NOW - 2,
      stepOutcome: "saved",
    });
    expect(await readReminderSettings(maya.id, NOW)).toEqual({
      emailReminders: true,
      followUpDays: 10,
      chosen: true,
      promptSnoozed: false,
    });
  });

  it("checks the account and reads the reminders in one statement", async () => {
    const maya = await createUser("maya@example.com");
    const db = await getDb();
    const select = vi.spyOn(db, "select");
    expect(await readReminderSettings(maya.id)).not.toBeNull();
    expect(select).toHaveBeenCalledTimes(1);
  });
});
