import { z } from "zod";
import { getDb } from "@/db/client";
import { lockUser } from "@/db/locks";
import { userSettings } from "@/db/schema";
import { LOCALES, type Locale } from "@/i18n/config";

export const LanguageChangeSchema = z.object({ locale: z.enum(LOCALES) }).strict();

// False when the account is gone.
export async function saveLanguage(
  userId: string,
  locale: Locale,
  now = Date.now(),
): Promise<boolean> {
  const db = await getDb();
  return db.transaction(async (tx) => {
    if (!(await lockUser(tx, userId))) return false;
    const set = { locale, updatedAt: now };
    await tx
      .insert(userSettings)
      .values({ userId, ...set })
      .onConflictDoUpdate({ target: userSettings.userId, set });
    return true;
  });
}
