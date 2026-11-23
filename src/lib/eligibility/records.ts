import { getDb } from "@/db/client";
import type { RowOf } from "@/db/columns";
import { lockUser } from "@/db/locks";
import { userSettings } from "@/db/schema";
import { readSharedSettings } from "@/lib/account/settings";
import { NO_CHOICE, type LookingForChoice, type PlaceChoice } from "@/lib/job-feed/types";
import { emptyWorkProfile, type WorkProfile } from "./profile";

// The work profile's columns of user_settings, with its own saved time (null: never saved).
export const WORK_COLUMNS = {
  country: userSettings.country,
  timeZone: userSettings.timeZone,
  workUs: userSettings.workUs,
  workUk: userSettings.workUk,
  workEu: userSettings.workEu,
  workCa: userSettings.workCa,
  fullTime: userSettings.fullTime,
  contract: userSettings.contract,
  remoteOnly: userSettings.remoteOnly,
  targetTitle: userSettings.targetTitle,
  targetFamily: userSettings.targetFamily,
  targetOccupation: userSettings.targetOccupation,
  targetLevel: userSettings.targetLevel,
  targetPlace: userSettings.targetPlace,
  updatedAt: userSettings.workUpdatedAt,
};

type WorkRow = RowOf<typeof WORK_COLUMNS>;

export type StoredWorkProfile = {
  profile: WorkProfile;
  updatedAt: number | null;
  lookingFor: LookingForChoice;
};

export type SaveWorkProfileResult =
  { status: "saved"; stored: StoredWorkProfile } | { status: "no_user" };

export function toStored(row: WorkRow): StoredWorkProfile {
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

export async function readWorkProfile(userId: string): Promise<StoredWorkProfile> {
  const { settings: row } = await readSharedSettings(userId);
  return row
    ? toStored({ ...row, updatedAt: row.workUpdatedAt })
    : { profile: emptyWorkProfile(), updatedAt: null, lookingFor: NO_CHOICE };
}

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
      workUpdatedAt: now,
      updatedAt: now,
    };
    const [row] = await tx
      .insert(userSettings)
      .values({ userId, ...values })
      .onConflictDoUpdate({ target: userSettings.userId, set: values })
      .returning(WORK_COLUMNS);
    if (!row) throw new Error("work profile upsert returned no row");
    return { status: "saved", stored: toStored(row) };
  });
}

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
      workUpdatedAt: now,
      updatedAt: now,
    };
    const [row] = await tx
      .insert(userSettings)
      .values({ userId, ...values })
      .onConflictDoUpdate({ target: userSettings.userId, set: values })
      .returning(WORK_COLUMNS);
    if (!row) throw new Error("work profile upsert returned no row");
    return { status: "saved", stored: toStored(row) };
  });
}
