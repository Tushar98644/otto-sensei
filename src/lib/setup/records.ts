import { eq } from "drizzle-orm";
import type { z } from "zod";
import { getDb } from "@/db/client";
import { lockUser } from "@/db/locks";
import { accountSetup, workProfiles } from "@/db/schema";
import { toStored, type StoredWorkProfile } from "@/lib/eligibility/records";
import { emptyWorkProfile, type WorkRegion } from "@/lib/eligibility/profile";
import { NO_CHOICE } from "@/lib/job-feed/types";
import { fillDefaults } from "./defaults";
import { NO_SETUP, type AccountSetup, type AccountSetupChange } from "./types";
import type { SetupDefaultsSchema } from "./validation";

type Row = typeof accountSetup.$inferSelect;

function toSetup(row: Row): AccountSetup {
  return {
    stepAt: row.stepAt,
    stepOutcome: row.stepOutcome,
    checklistHiddenAt: row.checklistHiddenAt,
    defaultsAt: row.defaultsAt,
    lookingForAt: row.lookingForAt,
    guess:
      row.countryGuess && row.countryFrom
        ? { country: row.countryGuess, from: row.countryFrom, region: row.regionGuess }
        : null,
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
  { status: "saved"; setup: AccountSetup } | { status: "no_user" };

const NO_GUESS = { countryGuess: null, countryFrom: null, regionGuess: null };

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
      ...(change.guess === undefined ? {} : NO_GUESS),
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

type RightColumns = Pick<typeof workProfiles.$inferInsert, "workUs" | "workUk" | "workEu" | "workCa">;

const HOME_RIGHT: Record<WorkRegion, Partial<RightColumns>> = {
  us: { workUs: "authorized" },
  uk: { workUk: "authorized" },
  eu: { workEu: "authorized" },
  ca: { workCa: "authorized" },
};

export type SaveSetupDefaultsResult =
  | { status: "saved"; setup: AccountSetup; work: StoredWorkProfile }
  | { status: "no_user" };

export async function saveSetupDefaults(
  userId: string,
  body: z.output<typeof SetupDefaultsSchema>,
  now = Date.now(),
): Promise<SaveSetupDefaultsResult> {
  const db = await getDb();
  return db.transaction(async (tx): Promise<SaveSetupDefaultsResult> => {
    if (!(await lockUser(tx, userId))) return { status: "no_user" };
    const [setupRow] = await tx
      .select()
      .from(accountSetup)
      .where(eq(accountSetup.userId, userId))
      .limit(1);
    const [workRow] = await tx
      .select()
      .from(workProfiles)
      .where(eq(workProfiles.userId, userId))
      .limit(1);
    let work: StoredWorkProfile = workRow
      ? toStored(workRow)
      : { profile: emptyWorkProfile(), updatedAt: null, lookingFor: NO_CHOICE };
    const setup = setupRow ? toSetup(setupRow) : NO_SETUP;
    const fill = fillDefaults(
      { ...work, defaultsAt: setup.defaultsAt, lookingForAt: setup.lookingForAt },
      body,
    );

    const values = {
      ...(fill.country === null ? {} : { country: fill.country }),
      ...(fill.timeZone === null ? {} : { timeZone: fill.timeZone }),
      ...(fill.region === null ? {} : HOME_RIGHT[fill.region]),
      ...(fill.lookingFor === null
        ? {}
        : {
            targetTitle: fill.lookingFor.role?.title ?? null,
            targetFamily: fill.lookingFor.role?.family ?? null,
            targetOccupation: fill.lookingFor.role?.occupation ?? null,
            targetLevel: fill.lookingFor.level,
          }),
    };
    if (Object.keys(values).length > 0) {
      const [row] = await tx
        .insert(workProfiles)
        .values({ userId, ...values, createdAt: now, updatedAt: now })
        .onConflictDoUpdate({ target: workProfiles.userId, set: { ...values, updatedAt: now } })
        .returning();
      if (!row) throw new Error("work profile upsert returned no row");
      work = toStored(row);
    }

    if (!fill.placeRan && !fill.lookingForRan) return { status: "saved", setup, work };
    const set = {
      ...(fill.placeRan ? { defaultsAt: now } : {}),
      ...(fill.lookingForRan ? { lookingForAt: now } : {}),
      ...(fill.guess
        ? {
            countryGuess: fill.guess.country,
            countryFrom: fill.guess.from,
            regionGuess: fill.guess.region,
          }
        : {}),
      updatedAt: now,
    };
    const [row] = await tx
      .insert(accountSetup)
      .values({ userId, ...set, createdAt: now })
      .onConflictDoUpdate({ target: accountSetup.userId, set })
      .returning();
    if (!row) throw new Error("account setup upsert returned no row");
    return { status: "saved", setup: toSetup(row), work };
  });
}
