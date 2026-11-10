import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { lockUser } from "@/db/locks";
import { workProfiles } from "@/db/schema";
import { NO_CHOICE, type LookingForChoice, type PlaceChoice } from "@/lib/job-feed/types";
import { emptyWorkProfile, type WorkProfile } from "./profile";

// Server-only. The account's work profile: one row keyed by user_id, so a user can only ever read
// or write their own.

type Row = typeof workProfiles.$inferSelect;

export type StoredWorkProfile = {
  profile: WorkProfile;
  updatedAt: number | null;
  lookingFor: LookingForChoice;
};

export type SaveWorkProfileResult =
  | { status: "saved"; stored: StoredWorkProfile }
  // The account was deleted after the request was signed in, so nothing may be written.
  | { status: "no_user" };

function toStored(row: Row): StoredWorkProfile {
  return {
    profile: {
      country: row.country,
      timeZone: row.timeZone,
      rights: { us: row.workUs, uk: row.workUk, eu: row.workEu, ca: row.workCa },
      fullTime: row.fullTime,
      contract: row.contract,
      remoteOnly: row.remoteOnly,
    },
    updatedAt: row.updatedAt,
    lookingFor: {
      role:
        row.targetTitle === null
          ? null
          : {
              title: row.targetTitle,
              family: row.targetFamily,
              occupation: row.targetOccupation,
            },
      level: row.targetLevel,
      place: row.targetPlace as PlaceChoice | null,
      remote: row.remoteOnly,
    },
  };
}

/** The saved profile, or an empty one (updatedAt null) when there is none yet. */
export async function readWorkProfile(userId: string): Promise<StoredWorkProfile> {
  const db = await getDb();
  const [row] = await db
    .select()
    .from(workProfiles)
    .where(eq(workProfiles.userId, userId))
    .limit(1);
  return row
    ? toStored(row)
    : { profile: emptyWorkProfile(), updatedAt: null, lookingFor: NO_CHOICE };
}

/**
 * Saves the "Looking for" card's choices (any plan: it only shapes the order of Matches). Its
 * "Remote only" is the work profile's. Creates an empty work profile around it when there is none.
 */
export async function saveLookingFor(
  userId: string,
  choice: LookingForChoice,
  now = Date.now(),
): Promise<SaveWorkProfileResult> {
  const db = await getDb();
  return db.transaction(async (tx): Promise<SaveWorkProfileResult> => {
    if (!(await lockUser(tx, userId))) return { status: "no_user" };
    const values = {
      targetTitle: choice.role?.title ?? null,
      targetFamily: choice.role?.family ?? null,
      targetOccupation: choice.role?.occupation ?? null,
      targetLevel: choice.level,
      targetPlace: choice.place,
      remoteOnly: choice.remote,
      updatedAt: now,
    };
    const [row] = await tx
      .insert(workProfiles)
      .values({ userId, ...values, createdAt: now })
      .onConflictDoUpdate({ target: workProfiles.userId, set: values })
      .returning();
    if (!row) throw new Error("work profile upsert returned no row");
    return { status: "saved", stored: toStored(row) };
  });
}

/**
 * Replaces the profile in one upsert, under the account's row lock so a write racing an account
 * deletion can't fail on the foreign key or leave a row behind.
 */
export async function saveWorkProfile(
  userId: string,
  profile: WorkProfile,
  now = Date.now(),
): Promise<SaveWorkProfileResult> {
  const db = await getDb();
  return db.transaction(async (tx): Promise<SaveWorkProfileResult> => {
    if (!(await lockUser(tx, userId))) return { status: "no_user" };
    const values = {
      country: profile.country,
      timeZone: profile.timeZone,
      workUs: profile.rights.us,
      workUk: profile.rights.uk,
      workEu: profile.rights.eu,
      workCa: profile.rights.ca,
      fullTime: profile.fullTime,
      contract: profile.contract,
      ...(profile.remoteOnly === undefined ? {} : { remoteOnly: profile.remoteOnly }),
      updatedAt: now,
    };
    const [row] = await tx
      .insert(workProfiles)
      .values({ userId, ...values, createdAt: now })
      .onConflictDoUpdate({ target: workProfiles.userId, set: values })
      .returning();
    if (!row) throw new Error("work profile upsert returned no row");
    return { status: "saved", stored: toStored(row) };
  });
}
