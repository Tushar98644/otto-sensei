import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { getDb } from "@/db/client";
import { careerLogEntries, users } from "@/db/schema";
import { createUser, resetDb } from "@/lib/auth/test-helpers";
import { DAY_MS } from "@/lib/time";
import {
  deleteEntry,
  entriesBetween,
  listEntries,
  readSettings,
  saveEntry,
  saveSettings,
  stopCheckinEmails,
} from "./records";
import { CAREER_LOG_LIMITS } from "./types";

// Sunday 22 November 2026, midday UTC.
const NOW = Date.UTC(2026, 10, 22, 12);

beforeEach(async () => {
  await resetDb();
});

describe("entries", () => {
  it("are one per month, saved as they're typed and listed newest first", async () => {
    const maya = await createUser("maya@example.com");
    await saveEntry(maya.id, "2026-10", { shipped: "Shipped search" }, NOW);
    await saveEntry(maya.id, "2026-11", { shipped: "Rebuilt signup" }, NOW);
    const saved = await saveEntry(maya.id, "2026-11", { numbers: "Signups up 18%" }, NOW + 1);
    expect(saved).toMatchObject({
      status: "saved",
      entry: { month: "2026-11", shipped: "Rebuilt signup", numbers: "Signups up 18%" },
    });
    const listed = await listEntries(maya.id);
    expect(listed.map((entry) => entry.month)).toEqual(["2026-11", "2026-10"]);
    expect(listed[0]?.updatedAt).toBe(NOW + 1);
    expect((await entriesBetween(maya.id, "2026-11", "2026-12")).map((e) => e.month)).toEqual([
      "2026-11",
    ]);
  });

  it("goes away when every word is cleared, and keeps Nothing new", async () => {
    const maya = await createUser("maya@example.com");
    await saveEntry(maya.id, "2026-11", { shipped: "Rebuilt signup" }, NOW);
    expect(await saveEntry(maya.id, "2026-11", { shipped: "" }, NOW)).toEqual({
      status: "saved",
      entry: null,
    });
    expect(await listEntries(maya.id)).toEqual([]);
    await saveEntry(maya.id, "2026-10", { nothingNew: true }, NOW);
    expect(await listEntries(maya.id)).toMatchObject([{ month: "2026-10", nothingNew: true }]);
  });

  it("never reads or deletes another account's months", async () => {
    const maya = await createUser("maya@example.com");
    const sam = await createUser("sam@example.com");
    await saveEntry(maya.id, "2026-11", { shipped: "Rebuilt signup" }, NOW);
    await deleteEntry(sam.id, "2026-11");
    expect(await listEntries(sam.id)).toEqual([]);
    expect(await listEntries(maya.id)).toHaveLength(1);
    await deleteEntry(maya.id, "2026-11");
    expect(await listEntries(maya.id)).toEqual([]);
  });

  it("holds ten years of months, then asks for room", async () => {
    const maya = await createUser("maya@example.com");
    const db = await getDb();
    await db.insert(careerLogEntries).values(
      Array.from({ length: CAREER_LOG_LIMITS.entries }, (_, index) => ({
        id: crypto.randomUUID(),
        userId: maya.id,
        month: `${2000 + Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}`,
        shipped: "Work",
        createdAt: NOW,
        updatedAt: NOW,
      })),
    );
    expect(await saveEntry(maya.id, "2026-11", { shipped: "One more" }, NOW)).toEqual({
      status: "full",
    });
    expect((await saveEntry(maya.id, "2000-01", { shipped: "Edited" }, NOW)).status).toBe("saved");
  });

  it("refuses an account that's gone", async () => {
    const maya = await createUser("maya@example.com");
    await (await getDb()).delete(users).where(eq(users.id, maya.id));
    expect(await saveEntry(maya.id, "2026-11", { shipped: "x" }, NOW)).toEqual({ status: "gone" });
    expect(await readSettings(maya.id, NOW)).toBeNull();
    expect(await saveSettings(maya.id, { checkins: true }, NOW)).toBeNull();
  });
});

describe("settings", () => {
  it("start off, with nothing chosen", async () => {
    const maya = await createUser("maya@example.com");
    expect(await readSettings(maya.id, NOW)).toEqual({
      checkins: false,
      emails: true,
      day: { week: 1, weekday: 1 },
      timeZone: "UTC",
      nextCheckinOn: null,
      pausedUntil: null,
      job: { role: "", company: "" },
      promptClosed: false,
      promptSnoozed: false,
    });
  });

  it("schedule the first check-in after today in the person's zone, and answer the card", async () => {
    const maya = await createUser("maya@example.com");
    const on = await saveSettings(
      maya.id,
      { checkins: true, timeZone: "Asia/Kolkata", job: { role: "Designer", company: "Northwind" } },
      NOW,
    );
    expect(on).toMatchObject({
      checkins: true,
      timeZone: "Asia/Kolkata",
      nextCheckinOn: "2026-12-07",
      job: { role: "Designer", company: "Northwind" },
      promptClosed: true,
    });
    const moved = await saveSettings(maya.id, { day: { week: 5, weekday: 5 } }, NOW);
    expect(moved?.nextCheckinOn).toBe("2026-11-27");
    const paused = await saveSettings(maya.id, { pauseMonths: 3 }, NOW);
    expect(paused?.pausedUntil).toBe("2027-02-22");
    expect((await saveSettings(maya.id, { pauseMonths: 0 }, NOW))?.pausedUntil).toBeNull();
  });

  it("rest the card on Not now without choosing, and close it for good on a choice", async () => {
    const maya = await createUser("maya@example.com");
    expect(await saveSettings(maya.id, { promptSnoozed: true }, NOW)).toMatchObject({
      checkins: false,
      promptClosed: false,
      promptSnoozed: true,
    });
    expect((await readSettings(maya.id, NOW + 31 * DAY_MS))?.promptSnoozed).toBe(false);
    expect(await saveSettings(maya.id, { checkins: false }, NOW)).toMatchObject({
      promptClosed: true,
    });
  });

  it("stop only the email on unsubscribe", async () => {
    const maya = await createUser("maya@example.com");
    await saveSettings(maya.id, { checkins: true }, NOW);
    expect(await stopCheckinEmails(maya.id)).toBe(true);
    expect(await readSettings(maya.id, NOW)).toMatchObject({ checkins: true, emails: false });
  });
});
