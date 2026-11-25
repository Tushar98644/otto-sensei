import { eq } from "drizzle-orm";
import { cache } from "react";
import { getDb } from "@/db/client";
import type { RowOf } from "@/db/columns";
import { users, userSettings } from "@/db/schema";

// The small user_settings columns the work profile, first-login setup and reminders read.
const SHARED_COLUMNS = {
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
  jobLangs: userSettings.jobLangs,
  workUpdatedAt: userSettings.workUpdatedAt,
  setupStepAt: userSettings.setupStepAt,
  setupStepOutcome: userSettings.setupStepOutcome,
  checklistHiddenAt: userSettings.checklistHiddenAt,
  setupDefaultsAt: userSettings.setupDefaultsAt,
  setupLookingForAt: userSettings.setupLookingForAt,
  countryGuess: userSettings.countryGuess,
  countryGuessFrom: userSettings.countryGuessFrom,
  regionGuess: userSettings.regionGuess,
  emailReminders: userSettings.emailReminders,
  followUpDays: userSettings.followUpDays,
  remindersChosen: userSettings.remindersChosen,
  reminderPromptSnoozedAt: userSettings.reminderPromptSnoozedAt,
};

export type SharedSettingsRow = RowOf<typeof SHARED_COLUMNS>;

// account: the users row exists; settings: null until the account saves a setting.
export type SharedSettings = { account: boolean; settings: SharedSettingsRow | null };

// One statement per render however many of the three a page asks for; outside a render, one per call.
export const readSharedSettings = cache(async (userId: string): Promise<SharedSettings> => {
  const db = await getDb();
  const [row] = await db
    .select({ stored: userSettings.userId, ...SHARED_COLUMNS })
    .from(users)
    .leftJoin(userSettings, eq(userSettings.userId, users.id))
    .where(eq(users.id, userId))
    .limit(1);
  if (!row) return { account: false, settings: null };
  const { stored, ...settings } = row;
  return { account: true, settings: stored === null ? null : (settings as SharedSettingsRow) };
});
