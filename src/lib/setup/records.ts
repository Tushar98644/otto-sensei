import { eq } from "drizzle-orm";
import type { z } from "zod";
import { getDb } from "@/db/client";
import { lockUser } from "@/db/locks";
import { userSettings } from "@/db/schema";
import { toStored, WORK_COLUMNS, type StoredWorkProfile } from "@/lib/eligibility/records";
import { emptyWorkProfile, type WorkRegion } from "@/lib/eligibility/profile";
import { NO_CHOICE } from "@/lib/job-feed/types";
import { fillDefaults } from "./defaults";
import { NO_SETUP, type AccountSetup, type AccountSetupChange } from "./types";
import type { SetupDefaultsSchema } from "./validation";

const SETUP_COLUMNS = {
  setupStepAt: userSettings.setupStepAt,
  setupStepOutcome: userSettings.setupStepOutcome,
  checklistHiddenAt: userSettings.checklistHiddenAt,
  setupDefaultsAt: userSettings.setupDefaultsAt,
  setupLookingForAt: userSettings.setupLookingForAt,
  countryGuess: userSettings.countryGuess,
  countryGuessFrom: userSettings.countryGuessFrom,
  regionGuess: userSettings.regionGuess,
};

type Row = Pick<typeof userSettings.$inferSelect, keyof typeof SETUP_COLUMNS>;

function toSetup(row: Row): AccountSetup {
  return {
    stepAt: row.setupStepAt,
    stepOutcome: row.setupStepOutcome,
    checklistHiddenAt: row.checklistHiddenAt,
    defaultsAt: row.setupDefaultsAt,
    lookingForAt: row.setupLookingForAt,
    guess:
      row.countryGuess && row.countryGuessFrom
        ? { country: row.countryGuess, from: row.countryGuessFrom, region: row.regionGuess }
        : null,
  };
}

export async function readAccountSetup(userId: string): Promise<AccountSetup> {
  const db = await getDb();
  const [row] = await db
    .select(SETUP_COLUMNS)
    .from(userSettings)
    .where(eq(userSettings.userId, userId))
    .limit(1);
  return row ? toSetup(row) : NO_SETUP;
}

export type SaveAccountSetupResult =
  { status: "saved"; setup: AccountSetup } | { status: "no_user" };

const NO_GUESS = { countryGuess: null, countryGuessFrom: null, regionGuess: null };

export async function saveAccountSetup(
  userId: string,
  change: AccountSetupChange,
  now = Date.now(),
): Promise<SaveAccountSetupResult> {
  const db = await getDb();
  return db.transaction(async (tx): Promise<SaveAccountSetupResult> => {
    if (!(await lockUser(tx, userId))) return { status: "no_user" };
    const set = {
      ...(change.step === undefined ? {} : { setupStepAt: now, setupStepOutcome: change.step }),
      ...(change.checklist === undefined
        ? {}
        : { checklistHiddenAt: change.checklist === "hidden" ? now : null }),
      ...(change.guess === undefined ? {} : NO_GUESS),
      updatedAt: now,
    };
    const [row] = await tx
      .insert(userSettings)
      .values({ userId, ...set })
      .onConflictDoUpdate({ target: userSettings.userId, set })
      .returning(SETUP_COLUMNS);
    if (!row) throw new Error("account setup upsert returned no row");
    return { status: "saved", setup: toSetup(row) };
  });
}

type RightColumns = Pick<
  typeof userSettings.$inferInsert,
  "workUs" | "workUk" | "workEu" | "workCa"
>;

const HOME_RIGHT: Record<WorkRegion, Partial<RightColumns>> = {
  us: { workUs: "authorized" },
  uk: { workUk: "authorized" },
  eu: { workEu: "authorized" },
  ca: { workCa: "authorized" },
};

export type SaveSetupDefaultsResult =
  { status: "saved"; setup: AccountSetup; work: StoredWorkProfile } | { status: "no_user" };

export async function saveSetupDefaults(
  userId: string,
  body: z.output<typeof SetupDefaultsSchema>,
  now = Date.now(),
): Promise<SaveSetupDefaultsResult> {
  const db = await getDb();
  return db.transaction(async (tx): Promise<SaveSetupDefaultsResult> => {
    if (!(await lockUser(tx, userId))) return { status: "no_user" };
    const [row] = await tx
      .select({ setup: SETUP_COLUMNS, work: WORK_COLUMNS })
      .from(userSettings)
      .where(eq(userSettings.userId, userId))
      .limit(1);
    const setupRow = row?.setup;
    const workRow = row?.work;
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
      const stamped = { ...values, workUpdatedAt: now, updatedAt: now };
      const [row] = await tx
        .insert(userSettings)
        .values({ userId, ...stamped })
        .onConflictDoUpdate({ target: userSettings.userId, set: stamped })
        .returning(WORK_COLUMNS);
      if (!row) throw new Error("work profile upsert returned no row");
      work = toStored(row);
    }

    if (!fill.placeRan && !fill.lookingForRan) return { status: "saved", setup, work };
    const set = {
      ...(fill.placeRan ? { setupDefaultsAt: now } : {}),
      ...(fill.lookingForRan ? { setupLookingForAt: now } : {}),
      ...(fill.guess
        ? {
            countryGuess: fill.guess.country,
            countryGuessFrom: fill.guess.from,
            regionGuess: fill.guess.region,
          }
        : {}),
      updatedAt: now,
    };
    const [saved] = await tx
      .insert(userSettings)
      .values({ userId, ...set })
      .onConflictDoUpdate({ target: userSettings.userId, set })
      .returning(SETUP_COLUMNS);
    if (!saved) throw new Error("account setup upsert returned no row");
    return { status: "saved", setup: toSetup(saved), work };
  });
}
