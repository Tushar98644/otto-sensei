import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, type Db, type Tx } from "@/db/client";
import { lockUser } from "@/db/locks";
import { userSettings } from "@/db/schema";
import { LOCALES, type Locale } from "@/i18n/config";
import { emailLocale } from "@/lib/notifications/locale";

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

// The language emails and bell notes are written in: never chosen, or gone, reads as English.
export async function savedLocale(db: Db | Tx, userId: string): Promise<Locale> {
  const [row] = await db
    .select({ locale: userSettings.locale })
    .from(userSettings)
    .where(eq(userSettings.userId, userId))
    .limit(1);
  return emailLocale(row?.locale);
}
