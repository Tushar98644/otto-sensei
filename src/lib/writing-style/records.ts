import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { lockUser } from "@/db/locks";
import { userSettings } from "@/db/schema";
import { isUserId } from "@/lib/users";
import { DEFAULT_WRITING_STYLE, type WritingStyle, type WritingStyleBody } from "./schema";

const COLUMNS = {
  tone: userSettings.writingTone,
  length: userSettings.writingLength,
  spelling: userSettings.writingSpelling,
  signOff: userSettings.writingSignOff,
  notes: userSettings.writingNotes,
  updatedAt: userSettings.writingUpdatedAt,
};

export async function readWritingStyle(userId: string): Promise<WritingStyle> {
  if (!isUserId(userId)) return DEFAULT_WRITING_STYLE;
  const db = await getDb();
  const [row] = await db
    .select(COLUMNS)
    .from(userSettings)
    .where(eq(userSettings.userId, userId))
    .limit(1);
  return row ?? DEFAULT_WRITING_STYLE;
}

// Under the account's row lock so it can't race account deletion; null once the account is gone.
export async function saveWritingStyle(
  userId: string,
  body: WritingStyleBody,
  now = Date.now(),
): Promise<WritingStyle | null> {
  if (!isUserId(userId)) return null;
  const db = await getDb();
  return db.transaction(async (tx) => {
    if (!(await lockUser(tx, userId))) return null;
    const set = {
      writingTone: body.tone,
      writingLength: body.length,
      writingSpelling: body.spelling,
      writingSignOff: body.signOff,
      writingNotes: body.notes,
      writingUpdatedAt: now,
      updatedAt: now,
    };
    const [row] = await tx
      .insert(userSettings)
      .values({ userId, ...set })
      .onConflictDoUpdate({ target: userSettings.userId, set })
      .returning(COLUMNS);
    return row ?? null;
  });
}
