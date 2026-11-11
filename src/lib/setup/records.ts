import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { lockUser } from "@/db/locks";
import { accountSetup } from "@/db/schema";
import { NO_SETUP, type AccountSetup, type AccountSetupChange } from "./types";

// Keyed by user_id, so a user only ever reads or writes their own.

type Row = typeof accountSetup.$inferSelect;

function toSetup(row: Row): AccountSetup {
  return {
    stepAt: row.stepAt,
    stepOutcome: row.stepOutcome,
    checklistHiddenAt: row.checklistHiddenAt,
  };
}

export async function readAccountSetup(userId: string): Promise<AccountSetup> {
  const db = await getDb();
  const [row] = await db
    .select()
    .from(accountSetup)
    .where(eq(accountSetup.userId, userId))
    .limit(1);
  return row ? toSetup(row) : NO_SETUP;
}

export type SaveAccountSetupResult =
  | { status: "saved"; setup: AccountSetup }
  // The account was deleted after the request was signed in, so nothing may be written.
  | { status: "no_user" };

export async function saveAccountSetup(
  userId: string,
  change: AccountSetupChange,
  now = Date.now(),
): Promise<SaveAccountSetupResult> {
  const db = await getDb();
  return db.transaction(async (tx): Promise<SaveAccountSetupResult> => {
    if (!(await lockUser(tx, userId))) return { status: "no_user" };
    const set = {
      ...(change.step === undefined ? {} : { stepAt: now, stepOutcome: change.step }),
      ...(change.checklist === undefined
        ? {}
        : { checklistHiddenAt: change.checklist === "hidden" ? now : null }),
      updatedAt: now,
    };
    const [row] = await tx
      .insert(accountSetup)
      .values({ userId, ...set, createdAt: now })
      .onConflictDoUpdate({ target: accountSetup.userId, set })
      .returning();
    if (!row) throw new Error("account setup upsert returned no row");
    return { status: "saved", setup: toSetup(row) };
  });
}
